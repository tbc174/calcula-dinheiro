const MAX_MESES = 600;
const MAX_VALOR = 1e12;

export function lerNumero(texto) {
  const s=String(texto).trim().replace(/R\$\s*/,'');
  if (!s || !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(s)) throw new RangeError('Preencha um número válido. Use vírgula para os decimais.');
  const valor=Number(s.replaceAll('.','').replace(',','.'));
  validarValor(valor);return valor;
}
function validarValor(valor, nome='O valor') {
  if (!Number.isFinite(valor)||valor<0||valor>MAX_VALOR) throw new RangeError(nome+' deve estar entre zero e 1 trilhão.');
}
function validarMeses(meses) {
  if(!Number.isInteger(meses)||meses<1||meses>MAX_MESES) throw new RangeError('Use um prazo de 1 a 600 meses (50 anos), sem fração de mês.');
}
export function taxaMensal(taxa, unidade='mes') {
  validarValor(taxa,'A taxa');
  if(!['mes','ano'].includes(unidade))throw new RangeError('Escolha taxa mensal ou anual.');
  const r=unidade==='ano'?Math.expm1(Math.log1p(taxa/100)/12):taxa/100;
  if(r>.2)throw new RangeError('Para esta calculadora, use uma taxa equivalente a até 20% ao mês.');
  return r;
}
export function juros({inicial,mensal,taxa,unidadeTaxa='mes',meses}) {
  validarValor(inicial);validarValor(mensal);validarMeses(meses);
  const r=taxaMensal(taxa,unidadeTaxa);let saldo=inicial;
  const linhas=[{mes:0,saldo,aplicado:inicial,juros:0}];
  for(let mes=1;mes<=meses;mes++) {
    saldo=saldo*(1+r)+mensal;
    if(!Number.isFinite(saldo)||saldo>1e15)throw new RangeError('O resultado ficou muito alto. Reduza o prazo, a taxa ou o valor.');
    const aplicado=inicial+mensal*mes;
    linhas.push({mes,saldo,aplicado,juros:Math.max(0,saldo-aplicado)});
  }
  return {...linhas.at(-1),linhas,taxaMensal:r};
}
export function metaMensal({meta,inicial,taxa,meses}) {
  validarValor(meta);validarValor(inicial);validarMeses(meses);
  if(meta<=0)throw new RangeError('A meta precisa ser maior que zero.');
  const r=taxaMensal(taxa),fator=(1+r)**meses;
  const mensal=Math.max(0,r===0?(meta-inicial)/meses:(meta-inicial*fator)/(Math.expm1(meses*Math.log1p(r))/r));
  return {...juros({inicial,mensal,taxa,meses}),mensal,atingida:inicial>=meta,semAportes:mensal===0};
}
export function porcentagem({modo,a,b,operacao='desconto'}) {
  validarValor(a);validarValor(b);
  if(modo==='parte')return {resultado:a*b/100,diferenca:a*b/100};
  if(modo==='proporcao') {if(b===0)throw new RangeError('O valor de referência deve ser maior que zero.');return {resultado:a/b*100,diferenca:0};}
  if(modo==='ajuste') {
    if(operacao==='desconto'&&b>100)throw new RangeError('O desconto deve estar entre 0% e 100%.');
    const diferenca=a*b/100;return {resultado:a+(operacao==='desconto'?-diferenca:diferenca),diferenca};
  }
  if(modo==='variacao') {if(a===0)throw new RangeError('A variação percentual exige um valor inicial maior que zero.');return {resultado:(b-a)/a*100,diferenca:b-a};}
  throw new RangeError('Escolha uma operação.');
}
export function compararPagamento({vista,entrada,parcelas,parcela}) {
  [vista,entrada,parcela].forEach(v=>validarValor(v));
  if(vista<=0)throw new RangeError('O preço à vista precisa ser maior que zero.');
  if(!Number.isInteger(parcelas)||parcelas<1||parcelas>600)throw new RangeError('Informe de 1 a 600 parcelas inteiras.');
  const total=entrada+parcelas*parcela,diferenca=total-vista;
  return {total,diferenca,percentual:diferenca/vista*100,melhor:Math.abs(diferenca)<.005?'empate':diferenca>0?'vista':'parcelado'};
}
export function indiceMes(texto) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(texto))throw new RangeError('Informe um mês válido.');
  const [ano,mes]=texto.split('-').map(Number);return ano*12+mes-1;
}
export function corrigirIpca(valor,inicio,fim,serie) {
  validarValor(valor);const a=indiceMes(inicio),b=indiceMes(fim);
  if(b<a)throw new RangeError('O mês final deve ser igual ou posterior ao inicial.');
  if(b-a>1200)throw new RangeError('Escolha um período de até 100 anos.');
  const taxas=new Map(serie);let fator=1;
  const linhas=[{mes:0,rotulo:'Início',saldo:valor,aplicado:valor,juros:0}];
  for(let i=a;i<=b;i++) {
    const mes=`${Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,taxa=taxas.get(mes);
    if(typeof taxa!=='number'||!Number.isFinite(taxa)||taxa<=-1)throw new RangeError('Não há IPCA válido para '+mes+'. Escolha apenas meses disponíveis.');
    fator*=1+taxa;linhas.push({mes:i-a+1,rotulo:mes,saldo:valor*fator,aplicado:valor,juros:valor*(fator-1)});
  }
  return {corrigido:valor*fator,variacao:fator-1,meses:b-a+1,linhas};
}
export function converterMoeda(valor,de,para,cotacoes) {
  validarValor(valor);
  if(!['BRL','USD','EUR'].includes(de)||!['BRL','USD','EUR'].includes(para))throw new RangeError('Escolha real, dólar ou euro.');
  if(de===para)return {resultado:valor,taxa:1,data:null};
  const obter=codigo=>{
    if(codigo==='BRL')return {venda:1,data:null};
    const cotacao=cotacoes.find(m=>m.codigo===codigo);
    if(!cotacao||!Number.isFinite(cotacao.venda)||cotacao.venda<=0)throw new RangeError('A cotação de '+codigo+' está indisponível.');
    return cotacao;
  };
  const a=obter(de),b=obter(para);
  if(a.data&&b.data&&a.data!==b.data)throw new RangeError('As duas moedas têm cotações de datas diferentes. Aguarde a atualização.');
  return {resultado:valor*a.venda/b.venda,taxa:a.venda/b.venda,data:a.data||b.data};
}
