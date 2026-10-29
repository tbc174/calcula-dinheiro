// Quanto rende: CDB, LCI/LCA, Tesouro Selic e poupança pelo mesmo prazo, já com IOF, IR e custódia.
// Portado de src/ferramentas/renda_fixa.py do TickerLab (sem o Prefixado e o IPCA+); os testes conferem os
// mesmos números do Python.
// - CDB: um percentual do CDI, sobre a taxa de cada dia útil; IOF nos primeiros 30 dias; IR pela tabela regressiva
//   (sobre o rendimento que sobra depois do IOF).
// - LCI ou LCA: um percentual do CDI, isenta de IR para pessoa física (a carência costuma passar dos 30 dias do IOF).
// - Tesouro Selic: a Selic de cada dia, que na prática anda junto com o CDI; IOF, IR e a custódia da B3
//   (0,2% ao ano, isenta até R$ 10 mil por CPF no Selic), aproximada pelo saldo médio.
// - Poupança: rende só no aniversário (a cada 30 dias), isenta; a TR fica de fora.
// O CDI pode mudar de um ano para o outro: cdiPorAno[k] vale do dia 365·k ao 365·(k+1) (o último vale para os anos
// seguintes). Dias corridos viram dias úteis pela proporção 252/365, sem o calendário de feriados.
// Fica de fora: marcação a mercado (vender o Tesouro antes do prazo), risco do emissor e FGC.

export const DIAS_UTEIS_POR_ANO=252;
export const DIAS_POR_ANO=365;
export const DIAS_DO_ANIVERSARIO=30;
export const DIAS_MAXIMOS=3650; // 10 anos
/** Custódia da B3 no Tesouro Direto: 0,2% ao ano, isenta até R$ 10 mil no Tesouro Selic (tarifas da B3, consulta em 10/2026). */
export const CUSTODIA_DO_TESOURO=0.002;
export const ISENTO_DE_CUSTODIA_ATE=10_000;
/** Regra da poupança desde 04/05/2012 (Lei 12.703/2012): 0,5% ao mês + TR com a Selic acima de 8,5% ao ano; senão 70% da Selic + TR. */
export const SELIC_QUE_MUDA_A_POUPANCA=0.085;
export const POUPANCA_CHEIA_AO_MES=0.005;
export const FRACAO_DA_SELIC_NA_POUPANCA=0.7;
const EMPATE_MAXIMO=10; // 1.000% do CDI: a busca do ponto de empate não passa disso
const PASSOS_DO_EMPATE=100;
const FOLGA_DO_TETO=1e-9; // a busca que encosta no teto não achou o empate

/** Tabela regressiva do IR da renda fixa (Lei 11.033/2004, art. 1º; P&R IRPF 2026, pergunta 734): [até quantos dias, alíquota]. */
const TABELA_REGRESSIVA:[number,number][]=[[180,0.225],[360,0.2],[720,0.175]];
const ALIQUOTA_MINIMA=0.15;
/** IOF sobre o rendimento por dia corrido, do 1º ao 29º dia (Decreto 6.306/2007, art. 32); zero a partir do 30º. */
const TABELA_DO_IOF=[0.96,0.93,0.90,0.86,0.83,0.80,0.76,0.73,0.70,0.66,0.63,0.60,0.56,0.53,0.50,0.46,0.43,0.40,0.36,0.33,0.30,0.26,0.23,0.20,0.16,0.13,0.10,0.06,0.03];

export type Entrada={
 valor:number;
 dias:number;
 /** CDI ao ano de cada ano da aplicação, como fração (0.1465 = 14,65%). */
 cdiPorAno:number[];
 /** Quanto do CDI o CDB paga, como fração (1 = 100%). */
 percentualDoCdb:number;
 /** Quanto do CDI a LCI ou LCA paga, como fração (0.9 = 90%). */
 percentualDaLci:number;
 /** Rendimento mensal da poupança, como fração (0.005 = 0,5%). */
 poupancaAoMes:number;
};
export type Opcao={
 nome:string;
 /** O valor no fim, antes de IOF, IR e custódia. */
 bruto:number;
 iof:number;
 /** A alíquota do IR (0 na opção isenta). */
 aliquota:number;
 imposto:number;
 custodia:number;
 liquido:number;
 isento:boolean;
};
export type UnidadeDePrazo='dia'|'mes'|'ano';

export function aliquotaDaRendaFixa(dias:number):number{
 for(const [ate,aliquota] of TABELA_REGRESSIVA)if(dias<=ate)return aliquota;
 return ALIQUOTA_MINIMA;
}
export function aliquotaDoIof(dias:number):number{return dias>=1&&dias<=TABELA_DO_IOF.length?TABELA_DO_IOF[dias-1]:0}

/** O rendimento mensal da poupança pela regra em vigor, dada a Selic ao ano (sem a TR). */
export function poupancaAoMes(selicAoAno:number):number{
 if(!Number.isFinite(selicAoAno)||selicAoAno<0)throw new RangeError('A Selic ao ano não pode ser negativa.');
 return selicAoAno>SELIC_QUE_MUDA_A_POUPANCA?POUPANCA_CHEIA_AO_MES:FRACAO_DA_SELIC_NA_POUPANCA*selicAoAno/12;
}

/** Dias corridos de um prazo digitado em dias, meses ou anos (ano de 365 dias; o mês é 1/12 dele, arredondado). */
export function diasDoPrazo(quantidade:number,unidade:UnidadeDePrazo):number{
 if(unidade==='dia')return Math.round(quantidade);
 if(unidade==='mes')return Math.round(quantidade*DIAS_POR_ANO/12);
 if(unidade==='ano')return Math.round(quantidade*DIAS_POR_ANO);
 throw new RangeError('O prazo é em dias, meses ou anos.');
}

function diasUteis(dias:number):number{return dias*DIAS_UTEIS_POR_ANO/DIAS_POR_ANO}

function conferir({valor,dias,cdiPorAno,percentualDoCdb,percentualDaLci,poupancaAoMes}:Entrada):void{
 if(!Number.isFinite(valor)||valor<0)throw new RangeError('O valor aplicado não pode ser negativo.');
 if(!Number.isInteger(dias)||dias<1||dias>DIAS_MAXIMOS)throw new RangeError(`O prazo precisa estar entre 1 e ${DIAS_MAXIMOS} dias.`);
 if(cdiPorAno.length===0)throw new RangeError('Informe o CDI de pelo menos um ano.');
 if(cdiPorAno.some(c=>!Number.isFinite(c)||c<0))throw new RangeError('O CDI ao ano não pode ser negativo.');
 if([percentualDoCdb,percentualDaLci].some(p=>!Number.isFinite(p)||p<0))throw new RangeError('O percentual do CDI não pode ser negativo.');
 if(!Number.isFinite(poupancaAoMes)||poupancaAoMes<0)throw new RangeError('A taxa da poupança não pode ser negativa.');
}

/** Os pedaços de até 365 dias da aplicação, cada um com o CDI do seu ano. */
function porAno(dias:number,taxas:number[]):[number,number][]{
 const pedacos:[number,number][]=[];
 for(let comeco=0;comeco<dias;comeco+=DIAS_POR_ANO){
  const ano=Math.min(Math.floor(comeco/DIAS_POR_ANO),taxas.length-1);
  pedacos.push([Math.min(DIAS_POR_ANO,dias-comeco),taxas[ano]]);
 }
 return pedacos;
}

function peloCdi(valor:number,dias:number,cdiPorAno:number[],percentual:number):number{
 let fator=1;
 for(const [diasDoPedaco,cdi] of porAno(dias,cdiPorAno)){
  const diaria=(Math.pow(1+cdi,1/DIAS_UTEIS_POR_ANO)-1)*percentual;
  fator*=Math.pow(1+diaria,diasUteis(diasDoPedaco));
 }
 return valor*fator;
}

/** 0,2% ao ano sobre o saldo médio que passa da isenção, pelo prazo. */
function custodia(valor:number,bruto:number,dias:number,isentoAte:number):number{
 const saldoMedio=(valor+bruto)/2;
 return CUSTODIA_DO_TESOURO*Math.max(saldoMedio-isentoAte,0)*dias/DIAS_POR_ANO;
}

function tributado(nome:string,valor:number,bruto:number,dias:number,custodiaPaga=0):Opcao{
 const rendimento=Math.max(bruto-valor,0);
 const iof=rendimento*aliquotaDoIof(dias);
 const aliquota=aliquotaDaRendaFixa(dias);
 const imposto=(rendimento-iof)*aliquota;
 return {nome,bruto,iof,aliquota,imposto,custodia:custodiaPaga,liquido:bruto-iof-imposto-custodiaPaga,isento:false};
}
function isento(nome:string,bruto:number):Opcao{return {nome,bruto,iof:0,aliquota:0,imposto:0,custodia:0,liquido:bruto,isento:true}}

/** As quatro opções pelo mesmo prazo: CDB, LCI ou LCA, Tesouro Selic e poupança, na ordem do Python. */
export function comparar(e:Entrada):Opcao[]{
 conferir(e);
 const {valor,dias,cdiPorAno,percentualDoCdb,percentualDaLci}=e;
 const cdb=peloCdi(valor,dias,cdiPorAno,percentualDoCdb);
 const selic=peloCdi(valor,dias,cdiPorAno,1);
 const aniversarios=Math.floor(dias/DIAS_DO_ANIVERSARIO);
 return [
  tributado('CDB',valor,cdb,dias),
  isento('LCI ou LCA',peloCdi(valor,dias,cdiPorAno,percentualDaLci)),
  tributado('Tesouro Selic',valor,selic,dias,custodia(valor,selic,dias,ISENTO_DE_CUSTODIA_ATE)),
  isento('Poupança',valor*Math.pow(1+e.poupancaAoMes,aniversarios)),
 ];
}

function cdbLiquido(valor:number,dias:number,cdiPorAno:number[],percentual:number):number{
 return tributado('CDB',valor,peloCdi(valor,dias,cdiPorAno,percentual),dias).liquido;
}

/** O percentual do CDI que o CDB precisa pagar para o líquido alcançar `liquido` (busca binária); null se nem 1.000% do CDI chega. */
export function cdbQueRende(valor:number,dias:number,cdiPorAno:number[],liquido:number):number|null{
 let baixo=0,alto=EMPATE_MAXIMO;
 for(let i=0;i<PASSOS_DO_EMPATE;i++){
  const meio=(baixo+alto)/2;
  if(cdbLiquido(valor,dias,cdiPorAno,meio)<liquido)baixo=meio;else alto=meio;
 }
 return baixo>=EMPATE_MAXIMO*(1-FOLGA_DO_TETO)?null:(baixo+alto)/2;
}

/** O percentual do CDI em que o CDB, depois do IR, empata com a LCI ou LCA (que é isenta). */
export function cdbQueEmpata(valor:number,dias:number,cdiPorAno:number[],percentualDaLci:number):number|null{
 conferir({valor,dias,cdiPorAno,percentualDoCdb:0,percentualDaLci,poupancaAoMes:0});
 return cdbQueRende(valor,dias,cdiPorAno,peloCdi(valor,dias,cdiPorAno,percentualDaLci));
}
