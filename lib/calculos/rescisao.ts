// Rescisão do contrato de trabalho do empregado CLT: o que entra no acerto, por tipo de desligamento.
// - Saldo de salário: os dias trabalhados no mês do desligamento, sobre o mês comercial de 30 dias (CLT, art. 64).
// - Aviso prévio (CLT, arts. 487 a 491; Lei nº 12.506/2011): 30 dias mais 3 por ano completo na empresa, até 90. Indenizado,
//   é pago no acerto e o contrato se projeta por esses dias para o 13º e as férias (CLT, art. 487, § 1º; OJ 82 da SDI-1 do
//   TST); no acordo do art. 484-A, metade. Trabalhado, os 30 dias são salário do mês, não verba do acerto, e só os dias a
//   mais por ano de casa são indenizados e projetados (Nota Técnica SRT/MTE nº 184/2012). No pedido de demissão sem o aviso
//   cumprido, a empresa pode descontar um salário (art. 487, § 2º), limitado ao que há para receber.
// - 13º proporcional (Lei nº 4.090/1962, art. 3º): 1/12 por mês do ano com 15 dias ou mais, até o fim projetado do contrato,
//   com INSS e imposto de renda calculados sobre ele, separados do saldo (Lei 8.212/1991, art. 28, § 7º; Lei 7.713/1988,
//   art. 26). Não é devido na justa causa.
// - Férias (CLT, arts. 130, 146 e 147): as vencidas (períodos completos não gozados) com o terço, em qualquer tipo; as
//   proporcionais (1/12 por mês do período aquisitivo com 15 dias ou mais, data a data) com o terço, exceto na justa causa.
//   Férias indenizadas não têm INSS nem imposto de renda (Lei 8.212, art. 28, § 9º, "d"; IN RFB nº 1.500/2014, art. 62).
// - Aviso prévio indenizado: sem INSS (Decreto 3.048/1999, art. 214, § 9º, V, "f") nem imposto de renda (SCI Cosit 2/2012).
// - Multa do FGTS (Lei 8.036/1990, art. 18, § 1º; CLT, art. 484-A): 40% sem justa causa, 20% no acordo, sobre o saldo da conta
//   mais os 8% dos valores do acerto que têm FGTS (saldo de salário, 13º e aviso indenizado). Sem o saldo do extrato, a conta
//   estima 8% do salário por mês de contrato, sem os rendimentos da conta.
// As tabelas de INSS e IRRF são as de lib/calculos/salario-liquido.ts (vigência conferida por teste; a tela avisa).
// Fica de fora: contrato por prazo determinado e de experiência, adiantamento do 13º já pago, faltas e afastamentos que tiram
// avos, dobra das férias vencidas há mais de um ano, horas extras e médias, pensão alimentícia, seguro-desemprego e o saque do
// FGTS (que não é verba do acerto).
import {
 INSS_2026,IRRF_2026,arredondar,inssDoEmpregado,irrfMensal,
 type Inss,type Irrf,type TabelaDoInss,type TabelaDoIrrf,
} from './salario-liquido.ts';
import {DIAS_PARA_CONTAR_O_MES,MESES_DO_ANO} from './decimo-terceiro.ts';

/** Aviso prévio mínimo (CLT, art. 487, II). */
export const DIAS_DE_AVISO_BASE=30;
/** Acréscimo por ano completo na mesma empresa (Lei 12.506/2011, art. 1º, parágrafo único). */
export const DIAS_DE_AVISO_POR_ANO=3;
export const TETO_DO_AVISO=90;
/** Multa do FGTS na dispensa sem justa causa (Lei 8.036/1990, art. 18, § 1º). */
export const ALIQUOTA_DA_MULTA=0.4;
/** Multa do FGTS no acordo entre empregado e empregador (CLT, art. 484-A, I, "b"). */
export const ALIQUOTA_DA_MULTA_NO_ACORDO=0.2;
/** Depósito mensal do FGTS (Lei 8.036/1990, art. 15). */
export const ALIQUOTA_DO_FGTS=0.08;
/** O salário mensal se divide por 30 dias para o saldo e o aviso (CLT, art. 64). */
export const DIAS_DO_MES_COMERCIAL=30;
const TERCO=3;
const METADE=2;
const DATA_ISO=/^\d{4}-\d{2}-\d{2}$/;
const MILISSEGUNDOS_POR_DIA=86_400_000;

export type Tipo='sem-justa-causa'|'pedido-de-demissao'|'acordo'|'justa-causa';
export type Aviso='indenizado'|'trabalhado'|'dispensado'|'nao-cumprido'|'nenhum';
export const TIPOS:{valor:Tipo;rotulo:string}[]=[
 {valor:'sem-justa-causa',rotulo:'Dispensa sem justa causa'},
 {valor:'pedido-de-demissao',rotulo:'Pedido de demissão'},
 {valor:'acordo',rotulo:'Acordo entre empregado e empresa (art. 484-A)'},
 {valor:'justa-causa',rotulo:'Dispensa por justa causa'},
];
export const AVISOS_POR_TIPO:Record<Tipo,{valor:Aviso;rotulo:string}[]>={
 'sem-justa-causa':[{valor:'indenizado',rotulo:'Indenizado (pago no acerto, sem trabalhar)'},{valor:'trabalhado',rotulo:'Trabalhado (30 dias cumpridos; os dias a mais por ano de casa são indenizados)'}],
 'acordo':[{valor:'indenizado',rotulo:'Indenizado pela metade (pago no acerto)'},{valor:'trabalhado',rotulo:'Trabalhado (30 dias cumpridos; os dias a mais por ano de casa são indenizados pela metade)'}],
 'pedido-de-demissao':[{valor:'trabalhado',rotulo:'Trabalhado (cumpri os 30 dias)'},{valor:'dispensado',rotulo:'Dispensado pela empresa (saí sem cumprir e sem desconto)'},{valor:'nao-cumprido',rotulo:'Não cumprido (a empresa desconta um salário)'}],
 'justa-causa':[{valor:'nenhum',rotulo:'Não há aviso prévio'}],
};

export type MesContado={ano:number;mes:number;dias:number;conta:boolean};
export type Linha={rotulo:string;valor:number;tipo:'verba'|'desconto'};
export type Entrada={
 /** Salário bruto mensal (sem médias de horas extras e comissões). */
 bruto:number;
 /** Data de admissão (AAAA-MM-DD). */
 admissao:string;
 /** Último dia trabalhado (AAAA-MM-DD); com aviso trabalhado, o último dia do aviso. */
 desligamento:string;
 tipo:Tipo;
 aviso:Aviso;
 /** Períodos aquisitivos completos (12 meses) ainda não gozados. */
 feriasVencidas?:number;
 dependentes?:number;
 /** Saldo da conta do FGTS no extrato; vazio (null/undefined) estima 8% do salário por mês de contrato. */
 saldoDoFgts?:number|null;
};
export type Resultado={
 tipo:Tipo;aviso:Aviso;anosCompletos:number;
 /** Fim do contrato para o 13º e as férias: o desligamento mais os dias do aviso indenizado. */
 dataFinal:string;
 saldo:{dias:number;valor:number;inss:Inss;irrf:Irrf};
 avisoPrevio:{dias:number;valorCheio:number;valor:number;desconto:number};
 decimo:{avos:number;meses:MesContado[];valor:number;inss:Inss|null;irrf:Irrf|null};
 ferias:{inicioDoPeriodo:string;avos:number;proporcionais:number;tercoProporcionais:number;periodosVencidos:number;vencidas:number;tercoVencidas:number};
 fgts:{saldoInformado:boolean;saldo:number;mesesDoContrato:number;depositosDaRescisao:number;base:number;aliquota:number;multa:number};
 linhas:Linha[];
 /** Soma das verbas, antes dos descontos. */
 verbas:number;
 descontos:number;
 /** O que a empresa paga no acerto. */
 liquido:number;
 /** O acerto mais a multa do FGTS, que sai pela conta do FGTS. */
 total:number;
};

function dataValida(texto:unknown):texto is string{
 if(typeof texto!=='string'||!DATA_ISO.test(texto))return false;
 const data=new Date(texto+'T00:00:00Z');
 return !Number.isNaN(data.getTime())&&data.toISOString().slice(0,10)===texto;
}
function paraMilissegundos(data:string):number{return new Date(data+'T00:00:00Z').getTime()}
function paraIso(ano:number,mes:number,dia:number):string{return new Date(Date.UTC(ano,mes-1,dia)).toISOString().slice(0,10)}
function partes(data:string):[number,number,number]{const [ano,mes,dia]=data.split('-').map(Number);return [ano,mes,dia]}
function diasDoMes(ano:number,mes:number):number{return new Date(Date.UTC(ano,mes,0)).getUTCDate()}
/** Dias de `inicio` a `fim`, os dois inclusos. */
function diasEntre(inicio:string,fim:string):number{return Math.round((paraMilissegundos(fim)-paraMilissegundos(inicio))/MILISSEGUNDOS_POR_DIA)+1}
const menor=(a:string,b:string):string=>a<b?a:b;
const maior=(a:string,b:string):string=>a>b?a:b;

/** A data mais `dias` dias (negativo volta). */
export function somarDias(data:string,dias:number):string{return new Date(paraMilissegundos(data)+dias*MILISSEGUNDOS_POR_DIA).toISOString().slice(0,10)}

/** A data mais `meses` meses, no dia de igual número; se o mês não tem o dia, no dia imediato (Código Civil, art. 132, § 3º). */
export function somarMeses(data:string,meses:number):string{
 const [ano,mes,dia]=partes(data);
 const indice=mes-1+meses,anoFinal=ano+Math.floor(indice/MESES_DO_ANO),mesFinal=(indice%MESES_DO_ANO+MESES_DO_ANO)%MESES_DO_ANO+1;
 const ultimo=diasDoMes(anoFinal,mesFinal);
 return dia<=ultimo?paraIso(anoFinal,mesFinal,dia):somarDias(paraIso(anoFinal,mesFinal,ultimo),1);
}

/** Anos completos de contrato entre a admissão e o desligamento (o aniversário completa o ano). */
export function anosCompletos(admissao:string,desligamento:string):number{
 let anos=0;
 while(somarMeses(admissao,MESES_DO_ANO*(anos+1))<=desligamento)anos++;
 return anos;
}

/** Dias de aviso prévio pela Lei 12.506/2011: 30 mais 3 por ano completo, até 90. */
export function diasDeAvisoPrevio(anos:number):number{return Math.min(TETO_DO_AVISO,DIAS_DE_AVISO_BASE+DIAS_DE_AVISO_POR_ANO*anos)}

/** Mês a mês do calendário entre as datas: dias dentro do contrato e se o mês conta como avo (15 dias ou mais). */
export function avosPorMesesDoCalendario(inicio:string,fim:string):MesContado[]{
 const meses:MesContado[]=[];
 let data=inicio;
 while(data<=fim){
  const [ano,mes]=partes(data);
  const fimDoMes=paraIso(ano,mes,diasDoMes(ano,mes));
  const dias=diasEntre(data,menor(fimDoMes,fim));
  meses.push({ano,mes,dias,conta:dias>=DIAS_PARA_CONTAR_O_MES});
  data=somarDias(fimDoMes,1);
 }
 return meses;
}

/** Avos de um período contado data a data (férias): períodos de um mês a partir de `inicio`; conta o que tem 15 dias ou mais. */
export function avosPorAniversario(inicio:string,fim:string):number{
 let avos=0;
 for(let k=0;;k++){
  const comeco=somarMeses(inicio,k);
  if(comeco>fim)return avos;
  const termino=somarDias(somarMeses(inicio,k+1),-1);
  if(diasEntre(comeco,menor(termino,fim))>=DIAS_PARA_CONTAR_O_MES)avos++;
 }
}

export function rotuloDoTipo(tipo:Tipo):string{return TIPOS.find(t=>t.valor===tipo)?.rotulo??tipo}

function conferirEntrada(e:Entrada):void{
 if(!Number.isFinite(e.bruto)||e.bruto<=0)throw new RangeError('Informe um salário bruto maior que zero.');
 if(!dataValida(e.admissao))throw new RangeError('Informe a data de admissão.');
 if(!dataValida(e.desligamento))throw new RangeError('Informe a data do desligamento.');
 if(e.desligamento<e.admissao)throw new RangeError('A data do desligamento não pode ser antes da admissão.');
 if(!TIPOS.some(t=>t.valor===e.tipo))throw new RangeError('Escolha o tipo de desligamento.');
 if(!AVISOS_POR_TIPO[e.tipo].some(a=>a.valor===e.aviso))throw new RangeError(`O aviso prévio escolhido não vale para "${rotuloDoTipo(e.tipo)}".`);
 const {feriasVencidas=0,dependentes=0,saldoDoFgts}=e;
 if(!Number.isInteger(dependentes)||dependentes<0)throw new RangeError('Dependentes: informe um número inteiro, de zero em diante.');
 if(!Number.isInteger(feriasVencidas)||feriasVencidas<0)throw new RangeError('Férias vencidas: informe um número inteiro de períodos, de zero em diante.');
 if(saldoDoFgts!=null&&(!Number.isFinite(saldoDoFgts)||saldoDoFgts<0))throw new RangeError('O saldo do FGTS não pode ser negativo.');
}

function mesmoMes(a:string,b:string):boolean{return a.slice(0,7)===b.slice(0,7)}

/** Dias do saldo de salário: os trabalhados no mês do desligamento, no mês comercial de 30 dias. */
function diasDoSaldo(admissao:string,desligamento:string):number{
 const dias=mesmoMes(admissao,desligamento)?diasEntre(admissao,desligamento):partes(desligamento)[2];
 return Math.min(DIAS_DO_MES_COMERCIAL,dias);
}

/** Meses de contrato antes do mês do desligamento (o do desligamento entra pelos depósitos do acerto), para estimar o saldo do FGTS. */
function mesesDoContrato(admissao:string,desligamento:string):number{
 if(mesmoMes(admissao,desligamento))return 0;
 const [ano,mes]=partes(desligamento);
 return avosPorMesesDoCalendario(admissao,somarDias(paraIso(ano,mes,1),-1)).filter(m=>m.conta).length;
}

/** Dias de aviso pagos no acerto: todos se indenizado; só os que passam de 30 se trabalhado; nenhum nos outros casos. */
function diasIndenizadosDoAviso(tipo:Tipo,aviso:Aviso,anos:number):number{
 if(tipo!=='sem-justa-causa'&&tipo!=='acordo')return 0;
 if(aviso==='indenizado')return diasDeAvisoPrevio(anos);
 return aviso==='trabalhado'?diasDeAvisoPrevio(anos)-DIAS_DE_AVISO_BASE:0;
}

function aliquotaDaMulta(tipo:Tipo):number{return tipo==='sem-justa-causa'?ALIQUOTA_DA_MULTA:tipo==='acordo'?ALIQUOTA_DA_MULTA_NO_ACORDO:0}

/** O acerto da rescisão: verbas, descontos, líquido e a multa do FGTS, pelas regras do tipo de desligamento. */
export function rescisao(entrada:Entrada,tabelas:{inss:TabelaDoInss;irrf:TabelaDoIrrf}={inss:INSS_2026,irrf:IRRF_2026}):Resultado{
 conferirEntrada(entrada);
 const {bruto,admissao,desligamento,tipo,aviso,feriasVencidas=0,dependentes=0,saldoDoFgts}=entrada;
 const anos=anosCompletos(admissao,desligamento);
 const diasDeAviso=diasIndenizadosDoAviso(tipo,aviso,anos);
 const dataFinal=somarDias(desligamento,diasDeAviso);
 const comProporcionais=tipo!=='justa-causa';

 const dias=diasDoSaldo(admissao,desligamento);
 const saldoValor=arredondar(bruto/DIAS_DO_MES_COMERCIAL*dias);
 const inssDoSaldo=inssDoEmpregado(saldoValor,tabelas.inss);
 const irrfDoSaldo=irrfMensal({rendimento:saldoValor,inss:inssDoSaldo.valor,dependentes},tabelas.irrf);

 const avisoCheio=arredondar(bruto/DIAS_DO_MES_COMERCIAL*diasDeAviso);
 const avisoValor=tipo==='acordo'?arredondar(avisoCheio/METADE):avisoCheio;

 const inicioDo13=maior(admissao,`${partes(desligamento)[0]}-01-01`);
 const meses=comProporcionais?avosPorMesesDoCalendario(inicioDo13,dataFinal):[];
 const avosDo13=meses.filter(m=>m.conta).length;
 const decimoValor=arredondar(bruto*avosDo13/MESES_DO_ANO);
 const inssDo13=decimoValor>0?inssDoEmpregado(decimoValor,tabelas.inss):null;
 const irrfDo13=decimoValor>0&&inssDo13?irrfMensal({rendimento:decimoValor,inss:inssDo13.valor,dependentes},tabelas.irrf):null;

 const inicioDoPeriodo=somarMeses(admissao,MESES_DO_ANO*anos);
 const avosDeFerias=comProporcionais?avosPorAniversario(inicioDoPeriodo,dataFinal):0;
 const proporcionais=arredondar(bruto*avosDeFerias/MESES_DO_ANO);
 const tercoProporcionais=arredondar(proporcionais/TERCO);
 const vencidas=arredondar(bruto*feriasVencidas);
 const tercoVencidas=arredondar(vencidas/TERCO);

 const verbas=arredondar(saldoValor+avisoValor+decimoValor+proporcionais+tercoProporcionais+vencidas+tercoVencidas);
 const descontosDeTributos=arredondar(inssDoSaldo.valor+irrfDoSaldo.valor+(inssDo13?.valor??0)+(irrfDo13?.valor??0));
 const descontoDoAviso=aviso==='nao-cumprido'?Math.max(0,Math.min(bruto,arredondar(verbas-descontosDeTributos))):0;
 const descontos=arredondar(descontosDeTributos+descontoDoAviso);
 const liquido=arredondar(verbas-descontos);

 const saldoInformado=saldoDoFgts!=null;
 const mesesDeContrato=mesesDoContrato(admissao,desligamento);
 const saldoDaConta=saldoInformado?saldoDoFgts:arredondar(ALIQUOTA_DO_FGTS*bruto*mesesDeContrato);
 const depositosDaRescisao=arredondar(ALIQUOTA_DO_FGTS*(saldoValor+decimoValor+avisoValor));
 const base=arredondar(saldoDaConta+depositosDaRescisao);
 const aliquota=aliquotaDaMulta(tipo);
 const multa=arredondar(base*aliquota);

 const avisoRotulo=(aviso==='trabalhado'?'Dias a mais do aviso prévio, indenizados':'Aviso prévio indenizado')+(tipo==='acordo'?' pela metade':'')+` (${diasDeAviso} dias)`;
 const todasAsLinhas:Linha[]=[
  {rotulo:`Saldo de salário (${dias} ${dias===1?'dia':'dias'})`,valor:saldoValor,tipo:'verba'},
  {rotulo:avisoRotulo,valor:avisoValor,tipo:'verba'},
  {rotulo:`13º proporcional (${avosDo13}/12)`,valor:decimoValor,tipo:'verba'},
  {rotulo:`Férias proporcionais (${avosDeFerias}/12)`,valor:proporcionais,tipo:'verba'},
  {rotulo:'1/3 sobre as férias proporcionais',valor:tercoProporcionais,tipo:'verba'},
  {rotulo:`Férias vencidas (${feriasVencidas} ${feriasVencidas===1?'período':'períodos'})`,valor:vencidas,tipo:'verba'},
  {rotulo:'1/3 sobre as férias vencidas',valor:tercoVencidas,tipo:'verba'},
  {rotulo:'INSS sobre o saldo de salário',valor:inssDoSaldo.valor,tipo:'desconto'},
  {rotulo:'Imposto de renda sobre o saldo de salário',valor:irrfDoSaldo.valor,tipo:'desconto'},
  {rotulo:'INSS sobre o 13º',valor:inssDo13?.valor??0,tipo:'desconto'},
  {rotulo:'Imposto de renda sobre o 13º',valor:irrfDo13?.valor??0,tipo:'desconto'},
  {rotulo:'Aviso prévio não cumprido (um salário, até o limite do acerto)',valor:descontoDoAviso,tipo:'desconto'},
 ];
 const linhas=todasAsLinhas.filter(l=>l.valor>0); // só o que tem valor aparece no acerto

 return {
  tipo,aviso,anosCompletos:anos,dataFinal,
  saldo:{dias,valor:saldoValor,inss:inssDoSaldo,irrf:irrfDoSaldo},
  avisoPrevio:{dias:diasDeAviso,valorCheio:avisoCheio,valor:avisoValor,desconto:descontoDoAviso},
  decimo:{avos:avosDo13,meses,valor:decimoValor,inss:inssDo13,irrf:irrfDo13},
  ferias:{inicioDoPeriodo,avos:avosDeFerias,proporcionais,tercoProporcionais,periodosVencidos:feriasVencidas,vencidas,tercoVencidas},
  fgts:{saldoInformado,saldo:saldoDaConta,mesesDoContrato:mesesDeContrato,depositosDaRescisao,base,aliquota,multa},
  linhas,verbas,descontos,liquido,total:arredondar(liquido+multa),
 };
}
