// Empréstimo pessoal a prazo fixo: parcela (Price), juros total e Custo Efetivo Total (CET), com IOF e tarifa.
// Não há Python para portar (src/ferramentas/ do TickerLab não tem CET): a conta foi desenhada aqui e conferida contra uma
// implementação independente em Python (os testes trazem os números).
//
// - Parcela: Price (a mesma todo mês), com a mesma função da calculadora de financiamento.
// - IOF da pessoa física (Decreto nº 6.306/2007, art. 7º, I, "b", 2, na redação do Decreto nº 8.392/2015, e § 15):
//   0,38% sobre o valor da operação mais 0,0082% por dia sobre cada parcela do principal, do dia da liberação ao dia do
//   pagamento, limitado a 365 dias (§ 1º). Aqui cada amortização paga 0,38% + 0,0082% × min(30 × mês, 365): meses de
//   30 dias, como a tela não sabe as datas. Os decretos de 2025 (12.466, 12.499) mexeram na pessoa jurídica, não aqui.
// - CET (Resolução CMN nº 4.881/2020): a taxa que iguala o valor que você recebeu ao valor presente das parcelas. Entra
//   tudo o que sai do seu bolso (juros, IOF, tarifa); por isso o CET fica acima da taxa do contrato sempre que há custo
//   além dos juros. Achado por bissecção (a função é monótona na taxa).
// - Custos "financiados": você recebe o valor pedido e a tarifa e o IOF entram na dívida (o IOF incide sobre o valor
//   financiado, inclusive sobre si mesmo: ponto fixo). "Descontados": a dívida é o valor pedido e você recebe menos.
//
// Ficam de fora seguros, a taxa de cadastro embutida na taxa de juros, multa e juros de atraso e as regras do consignado:
// a página diz isso. Sem React: só a conta.
import {parcelaPrice,PRAZO_MAXIMO} from './financiamento.ts';
import type {Vigencia} from './salario-liquido.ts';

export const MODOS_DOS_CUSTOS=['financiados','descontados'] as const;
export const PRAZOS_COMPARADOS=[6,12,24,36,48,60] as const;
export type ModoDosCustos=typeof MODOS_DOS_CUSTOS[number];

export type TabelaDoIof=Vigencia&{aliquotaFixa:number;aliquotaDiaria:number;diasMaximos:number;diasPorMes:number};

/** Alíquotas do IOF do crédito à pessoa física; `vigenteAte` é até quando foram conferidas (o teste falha depois). */
export const IOF_PESSOA_FISICA:TabelaDoIof={
 nome:'IOF do crédito à pessoa física',
 vigenteDesde:'2015-01-22',
 vigenteAte:'2026-12-31',
 fonte:'Decreto nº 6.306/2007, art. 7º, I, "b", 2 (redação do Decreto nº 8.392/2015) e § 15; limite de 365 dias no § 1º',
 aliquotaFixa:0.0038,
 aliquotaDiaria:0.000082,
 diasMaximos:365,
 diasPorMes:30,
};

const QUASE_ZERO=1e-9; // resíduo do float que vale como saldo zerado ou CET nulo
const CET_MAXIMO=10; // 1.000% ao mês: teto da busca
const PASSOS_DA_BISSECCAO=200; // chega à precisão do float muito antes
const PASSOS_DO_PONTO_FIXO=200;

export type Emprestimo={valor:number;taxa:number;meses:number;tarifa?:number;iof?:boolean;custos?:ModoDosCustos};
export type LinhaDoEmprestimo={mes:number;parcela:number;juros:number;amortizacao:number;saldo:number};
export type ResumoDoEmprestimo={
 valorRecebido:number;valorFinanciado:number;parcela:number;meses:number;
 totalPago:number;totalJuros:number;iof:number;tarifa:number;custoTotal:number;
 taxaAnual:number;cetMensal:number;cetAnual:number;linhas:LinhaDoEmprestimo[];
};
export type PrazoComparado={meses:number;parcela:number;custoTotal:number;cetAnual:number};

function conferir({valor,taxa,meses,tarifa=0,custos='financiados'}:Emprestimo):void{
 if(!Number.isFinite(valor)||valor<=0)throw new RangeError('O valor do empréstimo precisa ser maior que zero.');
 if(!Number.isFinite(taxa)||taxa<0||taxa>=1)throw new RangeError('A taxa ao mês precisa estar entre 0% e 100%.');
 if(!Number.isInteger(meses)||meses<1||meses>PRAZO_MAXIMO)throw new RangeError(`O prazo precisa estar entre 1 e ${PRAZO_MAXIMO} meses, sem fração de mês.`);
 if(!Number.isFinite(tarifa)||tarifa<0)throw new RangeError('A tarifa não pode ser negativa.');
 if(!(MODOS_DOS_CUSTOS as readonly string[]).includes(custos))throw new RangeError('Os custos entram na dívida (financiados) ou saem do valor liberado (descontados).');
}

/** A tabela Price de `valor` em `meses` meses: a última linha amortiza o que sobrou, para o saldo fechar em zero. */
function tabelaPrice(valor:number,taxa:number,meses:number):LinhaDoEmprestimo[]{
 const parcela=parcelaPrice(valor,taxa,meses);
 const linhas:LinhaDoEmprestimo[]=[];
 let saldo=valor;
 for(let mes=1;mes<=meses;mes++){
  const juros=saldo*taxa;
  const amortizacao=mes===meses?saldo:parcela-juros;
  saldo=mes===meses?0:saldo-amortizacao;
  linhas.push({mes,parcela:amortizacao+juros,juros,amortizacao,saldo});
 }
 return linhas;
}

/** O IOF de um empréstimo Price de `valor`: alíquota fixa mais a diária, por dias corridos de cada parcela, até o teto. */
export function iofDoEmprestimo({valor,taxa,meses}:Emprestimo,tabela:TabelaDoIof=IOF_PESSOA_FISICA):number{
 return tabelaPrice(valor,taxa,meses).reduce((soma,l)=>{
  const dias=Math.min(tabela.diasPorMes*l.mes,tabela.diasMaximos);
  return soma+l.amortizacao*(tabela.aliquotaFixa+tabela.aliquotaDiaria*dias);
 },0);
}

/** A taxa ao mês que iguala `recebido` ao valor presente das `parcelas` (CET da Resolução CMN 4.881/2020). */
export function cetMensal(recebido:number,parcelas:number[]):number{
 const valorPresente=(r:number)=>parcelas.reduce((s,p,k)=>s+p/Math.pow(1+r,k+1),0);
 if(valorPresente(0)-recebido<=QUASE_ZERO)return 0; // pagou o que recebeu, ou menos: custo zero
 let baixo=0,alto=CET_MAXIMO;
 for(let i=0;i<PASSOS_DA_BISSECCAO;i++){
  const meio=(baixo+alto)/2;
  if(valorPresente(meio)>recebido)baixo=meio;else alto=meio;
 }
 return (baixo+alto)/2;
}

/** O valor financiado quando a tarifa e o IOF entram na dívida: o IOF incide sobre o total, então é um ponto fixo. */
function valorFinanciadoComCustos(e:Emprestimo,tarifa:number,comIof:boolean):number{
 let financiado=e.valor+tarifa;
 if(!comIof)return financiado;
 for(let i=0;i<PASSOS_DO_PONTO_FIXO;i++){
  const proximo=e.valor+tarifa+iofDoEmprestimo({...e,valor:financiado});
  if(Math.abs(proximo-financiado)<QUASE_ZERO)return proximo;
  financiado=proximo;
 }
 return financiado;
}

const taxaAnualDaMensal=(r:number)=>Math.pow(1+r,12)-1;

/** Parcela, totais, IOF, tarifa e CET de um empréstimo Price, mês a mês. */
export function simularEmprestimo(e:Emprestimo):ResumoDoEmprestimo{
 conferir(e);
 const {valor,taxa,meses,tarifa=0,iof:comIof=true,custos='financiados'}=e;
 let valorFinanciado:number,valorRecebido:number,iof:number;
 if(custos==='financiados'){
  valorFinanciado=valorFinanciadoComCustos(e,tarifa,comIof);
  iof=comIof?iofDoEmprestimo({...e,valor:valorFinanciado}):0;
  valorRecebido=valor;
 }else{
  valorFinanciado=valor;
  iof=comIof?iofDoEmprestimo(e):0;
  valorRecebido=valor-tarifa-iof;
  if(valorRecebido<=0)throw new RangeError('A tarifa e o IOF descontados não podem engolir o valor do empréstimo.');
 }
 const linhas=tabelaPrice(valorFinanciado,taxa,meses);
 const totalPago=linhas.reduce((s,l)=>s+l.parcela,0);
 const cet=cetMensal(valorRecebido,linhas.map(l=>l.parcela));
 return {
  valorRecebido,valorFinanciado,parcela:parcelaPrice(valorFinanciado,taxa,meses),meses,
  totalPago,totalJuros:totalPago-valorFinanciado,iof,tarifa,custoTotal:totalPago-valorRecebido,
  taxaAnual:taxaAnualDaMensal(taxa),cetMensal:cet,cetAnual:taxaAnualDaMensal(cet),linhas,
 };
}

/** O mesmo empréstimo nos prazos de comparação (e no prazo digitado, se for outro), do mais curto ao mais longo. */
export function compararPrazos(e:Emprestimo):PrazoComparado[]{
 conferir(e);
 const prazos=[...new Set([...PRAZOS_COMPARADOS,e.meses])].sort((a,b)=>a-b);
 return prazos.map(meses=>{
  const r=simularEmprestimo({...e,meses});
  return {meses,parcela:r.parcela,custoTotal:r.custoTotal,cetAnual:r.cetAnual};
 });
}
