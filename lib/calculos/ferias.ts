// Férias do empregado CLT: quanto cai na conta antes de sair de férias.
// - Dias de direito (CLT, art. 130): 30 dias por período aquisitivo de 12 meses, menos conforme as faltas injustificadas no
//   período (até 5 faltas: 30 dias; 6 a 14: 24; 15 a 23: 18; 24 a 32: 12; mais de 32: nenhum dia).
// - Remuneração das férias (art. 142): o salário da época da concessão mais a média das parcelas variáveis (horas extras,
//   adicionais, comissões); a conta recebe a média já apurada. Férias = base / 30 × dias.
// - Terço constitucional (Constituição, art. 7º, XVII): um terço a mais sobre as férias.
// - Abono pecuniário (art. 143): o empregado pode vender até um terço dos dias de direito (10 de 30); recebe os dias vendidos como
//   salário mais o terço sobre eles, sem INSS (Lei 8.212/1991, art. 28, § 9º, "e", 6) nem imposto de renda (Lei 7.713/1988,
//   art. 6º; IN RFB nº 1.500/2014, art. 62).
// - Fracionamento (art. 134, § 1º): até três períodos, um de 14 dias ou mais e nenhum menor que 5; a conta mostra o período que o
//   empregado vai tirar agora.
// - Adiantamento do 13º (Lei 4.749/1965, art. 2º; Decreto 10.854/2021, art. 80): se pedido em janeiro, metade do salário do mês
//   anterior vem junto com as férias, sem desconto na hora; o acerto fica para dezembro.
// - INSS (Lei 8.212, art. 28, I; STF, Tema 985) e imposto de renda (Lei 7.713, art. 7º, I; IN RFB 1.500, art. 12) sobre férias e
//   terço, calculados em separado do salário do mês, com as tabelas de lib/calculos/salario-liquido.ts (vigência conferida por
//   teste; a tela avisa). A redução da Lei 15.270/2025 é aplicada como no salário; a tela pede para conferir o holerite.
// - Pagamento até 2 dias antes do início das férias (art. 145).
// Fica de fora: férias proporcionais (só na rescisão; ver lib/calculos/rescisao.ts), férias coletivas, a dobra por atraso na
// concessão (art. 137), o salário dos dias trabalhados no mês das férias, pensão alimentícia e empregado doméstico ou aprendiz.
import {
 INSS_2026,IRRF_2026,arredondar,inssDoEmpregado,irrfMensal,
 type Inss,type Irrf,type TabelaDoInss,type TabelaDoIrrf,
} from './salario-liquido.ts';
import {DIAS_DO_MES_COMERCIAL,type Linha,dataValida,somarDias} from './rescisao.ts';

/** Férias de quem não teve mais de 5 faltas injustificadas (CLT, art. 130, I). */
export const DIAS_DE_FERIAS=30;
/** O terço constitucional e o teto do abono: um terço (Constituição, art. 7º, XVII; CLT, art. 143). */
export const FRACAO_DO_ABONO=3;
/** Nenhum período de férias fracionadas pode ter menos de 5 dias (CLT, art. 134, § 1º). */
export const MENOR_PERIODO_DE_FERIAS=5;
/** As férias são pagas até 2 dias antes de começarem (CLT, art. 145). */
export const DIAS_DE_ANTECEDENCIA_DO_PAGAMENTO=2;
/** Dias de férias por faltas injustificadas no período aquisitivo (CLT, art. 130). Acima da última faixa, nenhum dia. */
export const TABELA_DE_FALTAS:readonly {ate:number;dias:number}[]=[{ate:5,dias:30},{ate:14,dias:24},{ate:23,dias:18},{ate:32,dias:12}];
/** O adiantamento do 13º nas férias é metade do salário (Lei 4.749/1965, art. 2º). */
const FRACAO_DO_ADIANTAMENTO=2;

export type Entrada={
 bruto:number;
 /** Média das parcelas variáveis que entram nas férias (horas extras, adicionais, comissões), por mês. */
 medias?:number;
 dependentes?:number;
 /** Faltas injustificadas no período aquisitivo. */
 faltas?:number;
 /** Dias vendidos como abono pecuniário (até um terço dos dias de direito). */
 diasVendidos?:number;
 /** Dias de férias desta vez; sem informar, todos os dias de direito que não foram vendidos. */
 dias?:number;
 adiantarDecimo?:boolean;
 /** Primeiro dia das férias (AAAA-MM-DD), só para dizer até quando a empresa deve pagar. */
 inicio?:string;
};
export type Resultado={
 base:number;diasDeDireito:number;maximoVendidos:number;dias:number;diasVendidos:number;
 ferias:number;terco:number;abono:number;tercoDoAbono:number;adiantamento:number;
 /** Férias mais o terço: o que tem INSS e imposto de renda. */
 rendimentoTributavel:number;inss:Inss;irrf:Irrf;
 verbas:number;descontos:number;liquido:number;
 pagarAte:string|null;linhas:Linha[];
};

/** Dias de férias a que o empregado tem direito pelas faltas injustificadas do período aquisitivo (CLT, art. 130). */
export function diasDeFeriasPorFaltas(faltas:number):number{
 return TABELA_DE_FALTAS.find(f=>faltas<=f.ate)?.dias??0;
}

/** Quantos dias podem ser vendidos como abono pecuniário: um terço dos dias de direito (CLT, art. 143). */
export function maximoDeDiasVendidos(diasDeDireito:number):number{return Math.floor(diasDeDireito/FRACAO_DO_ABONO)}

/** Último dia para a empresa pagar as férias: 2 dias antes do início (CLT, art. 145). */
export function dataDoPagamento(inicio:string):string{return somarDias(inicio,-DIAS_DE_ANTECEDENCIA_DO_PAGAMENTO)}

function conferirInteiro(valor:number,mensagem:string):void{
 if(!Number.isInteger(valor)||valor<0)throw new RangeError(mensagem);
}

function conferirEntrada(e:Entrada):void{
 if(!Number.isFinite(e.bruto)||e.bruto<=0)throw new RangeError('Informe um salário bruto maior que zero.');
 const {medias=0,dependentes=0,faltas=0,diasVendidos=0}=e;
 if(!Number.isFinite(medias)||medias<0)throw new RangeError('As médias de horas extras e adicionais não podem ser negativas.');
 conferirInteiro(dependentes,'Dependentes: informe um número inteiro, de zero em diante.');
 conferirInteiro(faltas,'Faltas injustificadas: informe um número inteiro, de zero em diante.');
 const direito=diasDeFeriasPorFaltas(faltas);
 if(direito===0)throw new RangeError('Com mais de 32 faltas injustificadas no período, não há direito a férias (CLT, art. 130).');
 conferirInteiro(diasVendidos,'Dias vendidos: informe um número inteiro, de zero em diante.');
 const maximo=maximoDeDiasVendidos(direito);
 if(diasVendidos>maximo)throw new RangeError(`Dá para vender até ${maximo} dias: um terço dos ${direito} dias de férias (CLT, art. 143).`);
 if(e.dias!=null){
  conferirInteiro(e.dias,'Dias de férias: informe um número inteiro.');
  if(e.dias<MENOR_PERIODO_DE_FERIAS)throw new RangeError(`Um período de férias tem pelo menos ${MENOR_PERIODO_DE_FERIAS} dias (CLT, art. 134, § 1º).`);
  if(e.dias>direito-diasVendidos)throw new RangeError(`Com ${diasVendidos} dias vendidos, sobram no máximo ${direito-diasVendidos} dias de férias.`);
 }
 if(e.inicio!=null&&e.inicio!==''&&!dataValida(e.inicio))throw new RangeError('Informe a data de início das férias.');
}

/** Férias com o terço, abono, adiantamento do 13º, INSS e imposto de renda, e o líquido que cai na conta. */
export function ferias(entrada:Entrada,tabelas:{inss:TabelaDoInss;irrf:TabelaDoIrrf}={inss:INSS_2026,irrf:IRRF_2026}):Resultado{
 conferirEntrada(entrada);
 const {bruto,medias=0,dependentes=0,faltas=0,diasVendidos=0,adiantarDecimo=false,inicio}=entrada;
 const base=arredondar(bruto+medias);
 const diasDeDireito=diasDeFeriasPorFaltas(faltas),maximoVendidos=maximoDeDiasVendidos(diasDeDireito);
 const dias=entrada.dias??diasDeDireito-diasVendidos;
 const valorDoDia=base/DIAS_DO_MES_COMERCIAL;
 const valorDasFerias=arredondar(valorDoDia*dias),terco=arredondar(valorDasFerias/FRACAO_DO_ABONO);
 const abono=arredondar(valorDoDia*diasVendidos),tercoDoAbono=arredondar(abono/FRACAO_DO_ABONO);
 const adiantamento=adiantarDecimo?arredondar(bruto/FRACAO_DO_ADIANTAMENTO):0;
 const rendimentoTributavel=arredondar(valorDasFerias+terco);
 const inss=inssDoEmpregado(rendimentoTributavel,tabelas.inss);
 const irrf=irrfMensal({rendimento:rendimentoTributavel,inss:inss.valor,dependentes},tabelas.irrf);
 const linhas:Linha[]=[
  {rotulo:`Férias (${dias} dias)`,valor:valorDasFerias,tipo:'verba'},
  {rotulo:'Terço constitucional',valor:terco,tipo:'verba'},
  ...(diasVendidos>0?[{rotulo:`Abono pecuniário (${diasVendidos} dias)`,valor:abono,tipo:'verba' as const},{rotulo:'Terço do abono',valor:tercoDoAbono,tipo:'verba' as const}]:[]),
  ...(adiantamento>0?[{rotulo:'Adiantamento do 13º',valor:adiantamento,tipo:'verba' as const}]:[]),
  {rotulo:'INSS',valor:inss.valor,tipo:'desconto'},
  ...(irrf.valor>0?[{rotulo:'Imposto de renda',valor:irrf.valor,tipo:'desconto' as const}]:[]),
 ];
 const verbas=arredondar(valorDasFerias+terco+abono+tercoDoAbono+adiantamento),descontos=arredondar(inss.valor+irrf.valor);
 return {
  base,diasDeDireito,maximoVendidos,dias,diasVendidos,ferias:valorDasFerias,terco,abono,tercoDoAbono,adiantamento,
  rendimentoTributavel,inss,irrf,verbas,descontos,liquido:arredondar(verbas-descontos),
  pagarAte:inicio?dataDoPagamento(inicio):null,linhas,
 };
}
