// Rotativo do cartão de crédito: o que custa não pagar a fatura inteira, o parcelamento que vem depois e o teto da lei.
// Não há Python para portar: a conta foi desenhada aqui e conferida contra uma implementação independente em Decimal (os
// testes trazem os números). A parcela Price, o IOF e o CET vêm da calculadora de empréstimo, para as três contas baterem.
//
// - Valor original da dívida: o que ficou sem pagar no vencimento (fatura menos o pagamento). É sobre ele que a lei põe o
//   teto (Resolução CMN nº 4.549/2017, art. 2º-A, IV, na redação da Resolução CMN nº 5.112/2023).
// - Rotativo: o saldo não pago só pode ficar no rotativo até o vencimento da fatura seguinte (Res. 4.549, art. 1º): aqui,
//   30 dias de juros à taxa do rotativo mais o IOF da pessoa física (0,38% + 0,0082% × 30 dias; Decreto nº 6.306/2007,
//   art. 7º). Depois disso o banco tem de oferecer o parcelamento em condições melhores que as do rotativo (art. 2º).
// - Parcelamento da fatura: o saldo que sobrou do rotativo (dívida, juros e IOF) é parcelado pela Price com IOF financiado,
//   como um empréstimo sem tarifa.
// - Teto de 100% (Lei nº 14.690/2023, art. 28, § 1º): o total cobrado de juros e encargos financeiros não pode passar do
//   valor original da dívida. "Encargos" são multa, juros de mora, tarifas e comissões (Res. 4.549, art. 2º-A, III); o IOF
//   é tributo e fica fora do teto. Quando o rotativo migra para o parcelamento, o teto conta desde o primeiro dia do
//   rotativo (art. 2º-A, parágrafo único). Aqui: os juros do rotativo gastam parte do teto; no parcelamento, cada mês cobra
//   juros até sobrar zero de teto, e dali em diante as parcelas só amortizam a dívida (ficam menores, o prazo não muda).
//   Como ninguém atrasa na simulação, multa e mora não entram; se entrassem, gastariam o mesmo teto.
// - Empréstimo pessoal: a comparação com pegar o valor original emprestado no vencimento, pela mesma conta da calculadora
//   de empréstimo (Price, IOF financiado, sem tarifa). O empréstimo não tem o teto da lei.
// - Taxas de referência: as médias do Banco Central para a pessoa física (Estatísticas monetárias e de crédito), com data
//   de conferência; a tela as sugere e avisa quando envelhecem. A taxa certa é a da sua fatura.
import {IOF_PESSOA_FISICA,simularEmprestimo} from './emprestimo.ts';
import type {Vigencia} from './salario-liquido.ts';

/** Teto de juros e encargos como fração do valor original: 100% (Lei nº 14.690/2023, art. 28, § 1º). */
export const TETO_DOS_JUROS=1;
/** O rotativo dura até a fatura seguinte (Res. CMN 4.549/2017, art. 1º): um mês de 30 dias, como no IOF do empréstimo. */
export const DIAS_DO_ROTATIVO=30;
/** Prazo máximo do parcelamento da fatura na tela: 60 meses é o mais longo que os bancos oferecem. */
export const PARCELAS_MAXIMAS=60;
const MESES_NO_ANO=12;
const QUASE_ZERO=1e-9; // resíduo do float que vale como "nada cortado pelo teto"

export type TaxasDeReferencia=Vigencia&{rotativoAoAno:number;parcelamentoAoAno:number;emprestimoAoAno:number};

/** Taxas médias ao ano do Banco Central (pessoa física, recursos livres), do mês mais recente conferido. */
export const TAXAS_DE_REFERENCIA:TaxasDeReferencia={
 nome:'Taxas médias do Banco Central (pessoa física, agosto de 2026)',
 vigenteDesde:'2026-08-01',
 vigenteAte:'2026-12-31',
 fonte:'Banco Central do Brasil, Estatísticas monetárias e de crédito de agosto de 2026 (taxas médias das operações com recursos livres, pessoa física): rotativo do cartão 444,9% a.a., parcelamento da fatura 192,1% a.a., crédito pessoal não consignado 110,2% a.a.',
 rotativoAoAno:4.449,
 parcelamentoAoAno:1.921,
 emprestimoAoAno:1.102,
};

export type Rotativo={fatura:number;pagamento:number;taxaDoRotativo:number;taxaDoParcelamento:number;parcelas:number;taxaDoEmprestimo:number};
export type LinhaDoParcelamento={mes:number;parcela:number;juros:number;amortizacao:number;saldo:number;jurosAcumulados:number};
export type ResumoDoRotativo={
 valorOriginal:number;teto:number;dividaMaxima:number;mesesParaDobrar:number|null;
 rotativo:{juros:number;iof:number;proximaFatura:number};
 parcelamento:{
  saldoParcelado:number;iof:number;parcela:number;parcelas:number;
  jurosSemTeto:number;juros:number;mesDoTeto:number|null;totalPago:number;
  jurosEEncargos:number;jurosEEncargosSemTeto:number;custoTotal:number;linhas:LinhaDoParcelamento[];
 };
 emprestimo:{valorFinanciado:number;iof:number;parcela:number;totalPago:number;totalJuros:number;custoTotal:number;cetAnual:number};
};

/** A taxa ao mês equivalente a uma taxa ao ano (juros compostos). */
export function taxaMensalDaAnual(aoAno:number):number{
 return Math.pow(1+aoAno,1/MESES_NO_ANO)-1;
}

/** Em quantos meses de rotativo os juros acumulados chegam ao teto (a dívida dobra); `null` quando a taxa é zero. */
export function mesesParaDobrar(taxa:number):number|null{
 if(taxa<=0)return null;
 return Math.ceil(Math.log(1+TETO_DOS_JUROS)/Math.log1p(taxa));
}

function conferirTaxa(taxa:number,nome:string):void{
 if(!Number.isFinite(taxa)||taxa<0||taxa>=1)throw new RangeError(`A taxa ${nome} ao mês precisa estar entre 0% e 100%.`);
}

function conferir({fatura,pagamento,taxaDoRotativo,taxaDoParcelamento,parcelas,taxaDoEmprestimo}:Rotativo):void{
 if(!Number.isFinite(fatura)||fatura<=0)throw new RangeError('O valor da fatura precisa ser maior que zero.');
 if(!Number.isFinite(pagamento)||pagamento<0)throw new RangeError('O pagamento não pode ser negativo.');
 if(pagamento>=fatura)throw new RangeError('Para simular o rotativo, pague menos que a fatura: quem paga a fatura inteira não entra no rotativo nem paga juros.');
 conferirTaxa(taxaDoRotativo,'do rotativo');
 conferirTaxa(taxaDoParcelamento,'do parcelamento');
 conferirTaxa(taxaDoEmprestimo,'do empréstimo');
 if(!Number.isInteger(parcelas)||parcelas<1||parcelas>PARCELAS_MAXIMAS)throw new RangeError(`O parcelamento precisa ter entre 1 e ${PARCELAS_MAXIMAS} parcelas, sem fração.`);
}

/** O IOF de um mês de rotativo: alíquota fixa mais a diária por 30 dias sobre o saldo, que é pago (ou refinanciado) de uma vez. */
function iofDoRotativo(saldo:number):number{
 const dias=Math.min(DIAS_DO_ROTATIVO,IOF_PESSOA_FISICA.diasMaximos);
 return saldo*(IOF_PESSOA_FISICA.aliquotaFixa+IOF_PESSOA_FISICA.aliquotaDiaria*dias);
}

/** Um mês de rotativo, o parcelamento com o teto da lei e o empréstimo pessoal equivalente. */
export function simularRotativo(e:Rotativo):ResumoDoRotativo{
 conferir(e);
 const valorOriginal=e.fatura-e.pagamento;
 const teto=valorOriginal*TETO_DOS_JUROS;
 const jurosDoRotativo=valorOriginal*e.taxaDoRotativo;
 const iofRotativo=iofDoRotativo(valorOriginal);
 const proximaFatura=valorOriginal+jurosDoRotativo+iofRotativo;

 // O parcelamento é um empréstimo do saldo do rotativo; depois o teto corta os juros que passarem do que sobrou dele.
 const p=simularEmprestimo({valor:proximaFatura,taxa:e.taxaDoParcelamento,meses:e.parcelas});
 const folga=Math.max(teto-jurosDoRotativo,0);
 let acumulado=0,mesDoTeto:number|null=null;
 const linhas:LinhaDoParcelamento[]=p.linhas.map(l=>{
  const juros=Math.min(l.juros,Math.max(folga-acumulado,0));
  if(mesDoTeto===null&&l.juros-juros>QUASE_ZERO)mesDoTeto=l.mes;
  acumulado+=juros;
  return {mes:l.mes,parcela:l.amortizacao+juros,juros,amortizacao:l.amortizacao,saldo:l.saldo,jurosAcumulados:jurosDoRotativo+acumulado};
 });
 const totalPago=linhas.reduce((s,l)=>s+l.parcela,0);

 const emp=simularEmprestimo({valor:valorOriginal,taxa:e.taxaDoEmprestimo,meses:e.parcelas});
 return {
  valorOriginal,teto,dividaMaxima:valorOriginal+teto,mesesParaDobrar:mesesParaDobrar(e.taxaDoRotativo),
  rotativo:{juros:jurosDoRotativo,iof:iofRotativo,proximaFatura},
  parcelamento:{
   saldoParcelado:p.valorFinanciado,iof:p.iof,parcela:p.parcela,parcelas:e.parcelas,
   jurosSemTeto:p.totalJuros,juros:acumulado,mesDoTeto,totalPago,
   jurosEEncargos:jurosDoRotativo+acumulado,jurosEEncargosSemTeto:jurosDoRotativo+p.totalJuros,custoTotal:totalPago-valorOriginal,linhas,
  },
  emprestimo:{valorFinanciado:emp.valorFinanciado,iof:emp.iof,parcela:emp.parcela,totalPago:emp.totalPago,totalJuros:emp.totalJuros,custoTotal:emp.custoTotal,cetAnual:emp.cetAnual},
 };
}
