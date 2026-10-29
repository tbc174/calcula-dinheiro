// 13º salário (gratificação natalina) do empregado CLT: Lei nº 4.090/1962, Lei nº 4.749/1965 e Decreto nº 10.854/2021
// (arts. 77 a 84).
// - Valor: 1/12 da remuneração de dezembro por mês trabalhado no ano; a fração igual ou superior a 15 dias de trabalho
//   no mês conta como mês inteiro (Lei 4.090, art. 1º, § 2º). Aqui a remuneração é o salário bruto mais, se houver, a
//   média de horas extras, comissões e adicionais.
// - 1ª parcela (adiantamento): até 30 de novembro, metade do 13º, sem INSS nem imposto de renda (Lei 4.749, art. 2º).
// - 2ª parcela: até 20 de dezembro, o 13º inteiro menos o adiantamento, o INSS e o imposto de renda, ambos calculados
//   sobre o 13º inteiro, separados do salário do mês: o INSS pela tabela por faixa (Lei 8.212/1991, art. 28, § 7º) e o
//   imposto como tributação exclusiva na fonte (Lei 7.713/1988, art. 26), com as deduções legais ou o desconto
//   simplificado, o que der a base menor (IN RFB nº 2.141/2023, art. 13), e a redução da Lei 15.270/2025.
// As tabelas de INSS e IRRF são as de lib/calculos/salario-liquido.ts (vigência conferida por teste; a tela avisa).
// Fica de fora: afastamentos e faltas que tiram o avo, pensão alimentícia, previdência privada, desligamento no ano
// (13º da rescisão), empregado doméstico com mais de um vínculo e regimes próprios de servidor.
import {
 INSS_2026,IRRF_2026,arredondar,inssDoEmpregado,irrfMensal,
 type Inss,type Irrf,type TabelaDoInss,type TabelaDoIrrf,
} from './salario-liquido.ts';

/** Fração de dias trabalhados no mês a partir da qual ele conta como avo inteiro. */
export const DIAS_PARA_CONTAR_O_MES=15;
export const MESES_DO_ANO=12;
/** O ano das tabelas em vigor: o 13º é sempre o deste ano, com estas tabelas. */
export const ANO_DAS_TABELAS=Number(INSS_2026.vigenteDesde.slice(0,4));
const DATA_ISO=/^\d{4}-\d{2}-\d{2}$/;
const METADE=2;

export type MesDoAno={mes:number;dias:number;conta:boolean};
export type Entrada={
 /** Salário bruto mensal (a remuneração de dezembro, sem as médias). */
 bruto:number;
 /** Média mensal de horas extras, comissões e adicionais, somada à base (opcional). */
 medias?:number;
 dependentes?:number;
 /** Data de admissão (AAAA-MM-DD); antes do ano, o 13º é integral. */
 admissao:string;
 ano?:number;
 /** Valor já recebido como 1ª parcela; vazio (null/undefined) usa a metade do 13º. */
 adiantamento?:number|null;
};
export type Resultado={
 ano:number;base:number;medias:number;dependentes:number;avos:number;meses:MesDoAno[];
 /** O 13º proporcional, antes dos descontos. */
 valor:number;
 primeiraParcela:number;adiantamentoInformado:boolean;
 inss:Inss;irrf:Irrf;descontos:number;segundaParcela:number;liquido:number;
};

/** Último dia para pagar a 1ª parcela (Lei 4.749/1965, art. 2º): 30 de novembro. */
export function prazoDaPrimeiraParcela(ano:number):string{return `${ano}-11-30`}
/** Último dia para pagar a 2ª parcela (Lei 4.749/1965, art. 1º): 20 de dezembro. */
export function prazoDaSegundaParcela(ano:number):string{return `${ano}-12-20`}

function conferirData(admissao:string):void{
 if(typeof admissao!=='string'||!DATA_ISO.test(admissao)||Number.isNaN(new Date(admissao+'T00:00:00Z').getTime()))throw new RangeError('Informe a data de admissão.');
}

function diasDoMes(ano:number,mes:number):number{return new Date(Date.UTC(ano,mes,0)).getUTCDate()}

/** Mês a mês do ano: quantos dias foram trabalhados e se o mês conta como avo (15 dias ou mais). */
export function mesesComDireito(admissao:string,ano:number):MesDoAno[]{
 conferirData(admissao);
 const [anoAdmissao,mesAdmissao,diaAdmissao]=admissao.split('-').map(Number);
 const meses:MesDoAno[]=[];
 for(let mes=1;mes<=MESES_DO_ANO;mes++){
  const ultimo=diasDoMes(ano,mes);
  let dias=0;
  if(anoAdmissao<ano)dias=ultimo;
  else if(anoAdmissao===ano&&mes>mesAdmissao)dias=ultimo;
  else if(anoAdmissao===ano&&mes===mesAdmissao)dias=ultimo-diaAdmissao+1;
  meses.push({mes,dias,conta:dias>=DIAS_PARA_CONTAR_O_MES});
 }
 return meses;
}

/** Quantos avos (meses) do ano dão direito ao 13º. */
export function avosDoAno(admissao:string,ano:number):number{return mesesComDireito(admissao,ano).filter(m=>m.conta).length}

function conferirEntrada({bruto,medias=0,dependentes=0,adiantamento}:Entrada):void{
 if(!Number.isFinite(bruto)||bruto<=0)throw new RangeError('Informe um salário bruto maior que zero.');
 if(!Number.isFinite(medias)||medias<0)throw new RangeError('As médias não podem ser negativas.');
 if(!Number.isInteger(dependentes)||dependentes<0)throw new RangeError('Dependentes: informe um número inteiro, de zero em diante.');
 if(adiantamento!=null&&(!Number.isFinite(adiantamento)||adiantamento<0))throw new RangeError('A 1ª parcela não pode ser negativa.');
}

/** O 13º do ano: valor proporcional, 1ª parcela, INSS e imposto sobre o total e a 2ª parcela. */
export function decimoTerceiro(entrada:Entrada,tabelas:{inss:TabelaDoInss;irrf:TabelaDoIrrf}={inss:INSS_2026,irrf:IRRF_2026}):Resultado{
 conferirEntrada(entrada);
 const {bruto,medias=0,dependentes=0,admissao,ano=ANO_DAS_TABELAS,adiantamento}=entrada;
 const meses=mesesComDireito(admissao,ano);
 const avos=meses.filter(m=>m.conta).length;
 if(avos===0)throw new RangeError(`Com essa data de admissão não há nenhum mês de ${ano} com 15 dias ou mais de trabalho: não há 13º neste ano.`);
 const base=bruto+medias;
 const valor=arredondar(base*avos/MESES_DO_ANO);
 const inss=inssDoEmpregado(valor,tabelas.inss);
 const irrf=irrfMensal({rendimento:valor,inss:inss.valor,dependentes},tabelas.irrf);
 const descontos=arredondar(inss.valor+irrf.valor);
 const liquido=arredondar(valor-descontos);
 const adiantamentoInformado=adiantamento!=null;
 const primeiraParcela=adiantamentoInformado?adiantamento:arredondar(valor/METADE);
 if(primeiraParcela>liquido)throw new RangeError(`A 1ª parcela informada é maior que o 13º líquido (${liquido.toFixed(2)}): confira o valor.`);
 const segundaParcela=arredondar(liquido-primeiraParcela);
 return {ano,base,medias,dependentes,avos,meses,valor,primeiraParcela,adiantamentoInformado,inss,irrf,descontos,segundaParcela,liquido};
}
