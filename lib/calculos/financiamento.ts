// Financiamento pelos sistemas SAC e Price, mês a mês, com uma amortização extra opcional.
// Portado de src/ferramentas/financiamento.py do TickerLab (os testes conferem a igualdade com o Python).
//
// - SAC: a amortização é a mesma todo mês (o valor ÷ o prazo); o juro cai com o saldo, e a parcela cai junto.
// - Price: a parcela é a mesma todo mês; no começo quase tudo é juro, no fim quase tudo é amortização.
// - Amortização extra num mês: reduz o prazo (mantém a parcela da Price ou a amortização do SAC e termina antes)
//   ou reduz a parcela (recalcula para o prazo que falta).
//
// A taxa é ao mês, em fração (0.01 = 1%); a tela converte a anual pela taxa equivalente. Ficam de fora os seguros,
// a taxa de administração e a correção do saldo (TR, IPCA): a página diz isso. Sem React: só a conta.

export const SISTEMAS=['sac','price'] as const;
export const MODOS_DA_EXTRA=['prazo','parcela'] as const;
export const PRAZO_MAXIMO=600; // meses: 50 anos
const QUASE_ZERO=1e-6; // resíduo do float que vale como saldo zerado

export type Sistema=typeof SISTEMAS[number];
export type ModoDaExtra=typeof MODOS_DA_EXTRA[number];
export type Linha={mes:number;parcela:number;juros:number;amortizacao:number;extra:number;saldo:number};
export type Financiamento={sistema:Sistema;valor:number;taxa:number;meses:number;extraMes?:number;extraValor?:number;extraModo?:ModoDaExtra};
export type Resumo={linhas:Linha[];meses:number;primeiraParcela:number;ultimaParcela:number;totalJuros:number;totalPago:number;totalExtra:number};

/** A parcela fixa que paga `valor` em `meses` meses à `taxa` ao mês. */
export function parcelaPrice(valor:number,taxa:number,meses:number):number{
 if(taxa===0)return valor/meses;
 // 1 − (1 + taxa)^−meses sem perder os dígitos quando a taxa é quase zero
 return valor*taxa/-Math.expm1(-meses*Math.log1p(taxa));
}

function conferir({sistema,valor,taxa,meses,extraMes=0,extraValor=0,extraModo='prazo'}:Financiamento):void{
 if(!(SISTEMAS as readonly string[]).includes(sistema))throw new RangeError('Escolha o sistema SAC ou Price.');
 if(!Number.isFinite(valor)||valor<=0)throw new RangeError('O valor financiado precisa ser maior que zero.');
 if(!Number.isFinite(taxa)||taxa<0||taxa>=1)throw new RangeError('A taxa ao mês precisa estar entre 0% e 100%.');
 if(!Number.isInteger(meses)||meses<1||meses>PRAZO_MAXIMO)throw new RangeError(`O prazo precisa estar entre 1 e ${PRAZO_MAXIMO} meses (50 anos), sem fração de mês.`);
 if(!(MODOS_DA_EXTRA as readonly string[]).includes(extraModo))throw new RangeError('A amortização extra reduz o prazo ou a parcela.');
 if(!Number.isFinite(extraValor)||extraValor<0)throw new RangeError('A amortização extra não pode ser negativa.');
 if(!Number.isInteger(extraMes)||extraMes<0||extraMes>meses)throw new RangeError('O mês da amortização extra precisa ser um mês inteiro dentro do prazo.');
}

/** O financiamento mês a mês, até o saldo zerar. */
export function tabela(f:Financiamento):Linha[]{
 conferir(f);
 const {sistema,valor,taxa,meses,extraMes=0,extraValor=0,extraModo='prazo'}=f;
 let saldo=valor,amortizacaoDoSac=valor/meses,parcelaFixa=parcelaPrice(valor,taxa,meses);
 const linhas:Linha[]=[];
 for(let mes=1;mes<=meses;mes++){
  const juros=saldo*taxa;
  let amortizacao:number,parcela:number;
  if(sistema==='sac'){amortizacao=Math.min(amortizacaoDoSac,saldo);parcela=amortizacao+juros}
  else{parcela=Math.min(parcelaFixa,saldo+juros);amortizacao=parcela-juros}
  if(mes===meses){amortizacao=saldo;parcela=amortizacao+juros} // quita o que sobrou: com taxa alta, o float deixa resíduo
  saldo-=amortizacao;
  let extra=0;
  if(mes===extraMes&&extraValor>0&&saldo>QUASE_ZERO){
   extra=Math.min(extraValor,saldo);
   saldo-=extra;
   const restantes=meses-mes;
   if(extraModo==='parcela'&&restantes>0){amortizacaoDoSac=saldo/restantes;parcelaFixa=parcelaPrice(saldo,taxa,restantes)}
  }
  if(saldo<=QUASE_ZERO)saldo=0;
  linhas.push({mes,parcela,juros,amortizacao,extra,saldo});
  if(saldo===0)break;
 }
 return linhas;
}

/** A tabela com os números que a página mostra: primeira e última parcela, juros, total pago (parcelas + extra). */
export function resumo(f:Financiamento):Resumo{
 const linhas=tabela(f);
 const totalJuros=linhas.reduce((s,l)=>s+l.juros,0),totalExtra=linhas.reduce((s,l)=>s+l.extra,0);
 return {linhas,meses:linhas.length,primeiraParcela:linhas[0].parcela,ultimaParcela:linhas[linhas.length-1].parcela,totalJuros,totalExtra,totalPago:f.valor+totalJuros};
}

/** Os dois sistemas lado a lado, com as mesmas entradas. */
export function compararSistemas(f:Omit<Financiamento,'sistema'>):{sac:Resumo;price:Resumo}{
 return {sac:resumo({...f,sistema:'sac'}),price:resumo({...f,sistema:'price'})};
}
