// Salário líquido do empregado (CLT): bruto − INSS − imposto de renda retido na fonte − outros descontos.
// - INSS por faixa (alíquota progressiva): cada alíquota incide só sobre a fatia do salário dentro da faixa, até o teto.
// - IRRF: base de cálculo = bruto − deduções; a lei deixa escolher entre as deduções legais (INSS e R$ por dependente) e o
//   desconto simplificado (um valor fixo, sem dependentes); vale a que der a base menor. Sobre a base, a tabela progressiva
//   (alíquota × base − parcela a deduzir); do imposto, sai a redução da Lei 15.270/2025 (zera até R$ 5 mil de rendimento e
//   decresce até R$ 7.350), limitada ao próprio imposto.
// Não há Python do TickerLab para portar: as tabelas vêm das fontes oficiais citadas em cada uma. Elas mudam todo ano
// (o INSS pela portaria de janeiro; o IRRF por lei), por isso cada tabela diz até quando foi conferida (`vigenteAte`):
// um teste falha quando a data passa, e a tela avisa perto do fim.
// Fica de fora: 13º, férias, adicionais, horas extras, pensão alimentícia, previdência privada e outras deduções, salário-
// família, contribuinte individual e servidor público (regimes próprios).

/** Tabela por ano, com o período em que foi conferida como válida (AAAA-MM-DD) e a fonte oficial. */
export type Vigencia={nome:string;vigenteDesde:string;vigenteAte:string;fonte:string};
export type FaixaDoInss={ate:number;aliquota:number};
export type TabelaDoInss=Vigencia&{faixas:FaixaDoInss[];teto:number};
export type FaixaDoIrrf={ate:number;aliquota:number;parcelaADeduzir:number};
export type TabelaDoIrrf=Vigencia&{
 faixas:FaixaDoIrrf[];
 /** Dedução mensal por dependente, nas deduções legais. */
 dependente:number;
 /** Desconto simplificado mensal, que substitui todas as deduções legais quando for melhor. */
 simplificado:number;
 /** Redução da Lei 15.270/2025 sobre o imposto: até `ate`, no máximo `maxima`; de lá até `limite`, `constante − coeficiente × rendimento`. */
 reducao:{ate:number;maxima:number;limite:number;constante:number;coeficiente:number};
};

/** INSS do empregado, empregado doméstico e trabalhador avulso em 2026: Portaria Interministerial MPS/MF nº 13, de
 * 9/1/2026 (competências de janeiro a dezembro de 2026), conforme a tabela publicada pelo INSS (gov.br/inss, atualizada
 * em 13/1/2026). A última faixa termina no teto do salário de contribuição. */
export const INSS_2026:TabelaDoInss={
 nome:'INSS 2026',vigenteDesde:'2026-01-01',vigenteAte:'2026-12-31',
 fonte:'Portaria Interministerial MPS/MF nº 13, de 9 de janeiro de 2026 (tabela do INSS em gov.br/inss)',
 faixas:[{ate:1621.00,aliquota:0.075},{ate:2902.84,aliquota:0.09},{ate:4354.27,aliquota:0.12},{ate:8475.55,aliquota:0.14}],
 teto:8475.55,
};

/** IRRF mensal em 2026: tabela progressiva da Lei nº 15.191/2025 (em vigor desde maio de 2025 e mantida em 2026),
 * dedução por dependente e desconto simplificado da mesma tabela, e redução do art. 3º-A da Lei nº 9.250/1995, incluído
 * pela Lei nº 15.270/2025, com efeitos desde 1º/1/2026 (Receita Federal, "Tabelas 2026", atualizada em 27/4/2026, e
 * "Exemplos de aplicação da Lei 15.270/2025", atualizada em 4/3/2026). A tabela não tem fim marcado em lei; o
 * `vigenteAte` é até quando ela foi conferida. */
export const IRRF_2026:TabelaDoIrrf={
 nome:'IRRF 2026',vigenteDesde:'2026-01-01',vigenteAte:'2026-12-31',
 fonte:'Lei nº 15.191/2025 (tabela progressiva) e Lei nº 15.270/2025 (redução), nas tabelas de 2026 da Receita Federal',
 faixas:[
  {ate:2428.80,aliquota:0,parcelaADeduzir:0},
  {ate:2826.65,aliquota:0.075,parcelaADeduzir:182.16},
  {ate:3751.05,aliquota:0.15,parcelaADeduzir:394.16},
  {ate:4664.68,aliquota:0.225,parcelaADeduzir:675.49},
  {ate:Number.POSITIVE_INFINITY,aliquota:0.275,parcelaADeduzir:908.73},
 ],
 dependente:189.59,
 simplificado:607.20,
 reducao:{ate:5000,maxima:312.89,limite:7350,constante:978.62,coeficiente:0.133145},
};

/** Quantos dias antes do fim da vigência a tela começa a avisar. */
export const DIAS_DE_AVISO=30;
const MILISSEGUNDOS_POR_DIA=86_400_000;
const CENTAVOS=100;
const FOLGA_DO_ARREDONDAMENTO=1e-9; // 121.575 em ponto flutuante pode ser 121.57499…; a folha arredonda para cima

export type EstadoDaTabela='vigente'|'perto-do-fim'|'fora-da-vigencia';
export type Inss={valor:number;aliquotaEfetiva:number;noTeto:boolean;faixas:{ate:number;aliquota:number;base:number;valor:number}[]};
export type Irrf={
 baseLegal:number;baseSimplificada:number;base:number;modo:'legal'|'simplificado';
 aliquota:number;parcelaADeduzir:number;impostoPelaTabela:number;reducao:number;valor:number;aliquotaEfetiva:number;
};
export type Entrada={bruto:number;dependentes?:number;outrosDescontos?:number};
export type Resultado={bruto:number;dependentes:number;inss:Inss;irrf:Irrf;outrosDescontos:number;descontos:number;liquido:number};

/** Arredonda para o centavo, meio centavo para cima, como a folha de pagamento. */
export function arredondar(valor:number):number{return Math.round(valor*CENTAVOS+FOLGA_DO_ARREDONDAMENTO)/CENTAVOS}

function diaIso(data:Date):string{return data.toISOString().slice(0,10)}

/** Se a tabela vale na data: 'vigente', 'perto-do-fim' (faltam até DIAS_DE_AVISO dias) ou 'fora-da-vigencia' (antes ou depois). */
export function estadoDaTabela(hoje:Date,tabela:Vigencia):EstadoDaTabela{
 const dia=diaIso(hoje);
 if(dia<tabela.vigenteDesde||dia>tabela.vigenteAte)return 'fora-da-vigencia';
 const fim=new Date(tabela.vigenteAte+'T00:00:00Z').getTime(),agora=new Date(dia+'T00:00:00Z').getTime();
 return (fim-agora)/MILISSEGUNDOS_POR_DIA<DIAS_DE_AVISO?'perto-do-fim':'vigente';
}

function conferirSalario(salario:number):void{
 if(!Number.isFinite(salario)||salario<=0)throw new RangeError('Informe um salário bruto maior que zero.');
}

/** INSS do empregado por faixa: a alíquota de cada faixa só sobre a fatia do salário que cai nela; acima do teto, nada. */
export function inssDoEmpregado(salario:number,tabela:TabelaDoInss=INSS_2026):Inss{
 conferirSalario(salario);
 const faixas:Inss['faixas']=[];
 let inicio=0,total=0;
 for(const f of tabela.faixas){
  if(salario<=inicio)break;
  const base=Math.min(salario,f.ate)-inicio,valor=base*f.aliquota;
  faixas.push({ate:f.ate,aliquota:f.aliquota,base,valor});
  total+=valor;inicio=f.ate;
 }
 const valor=arredondar(total);
 return {valor,aliquotaEfetiva:valor/salario,noTeto:salario>=tabela.teto,faixas};
}

function faixaDaBase(base:number,tabela:TabelaDoIrrf):FaixaDoIrrf{
 return tabela.faixas.find(f=>base<=f.ate)??tabela.faixas[tabela.faixas.length-1];
}

/** Redução da Lei 15.270/2025 sobre o imposto da tabela: pelo rendimento tributável bruto do mês, limitada ao imposto. */
function reducaoDoImposto(rendimento:number,impostoPelaTabela:number,tabela:TabelaDoIrrf):number{
 const r=tabela.reducao;
 let reducao=0;
 if(rendimento<=r.ate)reducao=r.maxima;
 else if(rendimento<=r.limite)reducao=arredondar(r.constante-r.coeficiente*rendimento);
 return Math.max(0,Math.min(reducao,impostoPelaTabela));
}

function conferirDependentes(dependentes:number):void{
 if(!Number.isInteger(dependentes)||dependentes<0)throw new RangeError('Dependentes: informe um número inteiro, de zero em diante.');
}

/** Imposto de renda retido na fonte do mês. `rendimento` é o salário bruto tributável; `inss` é o que já foi descontado dele. */
export function irrfMensal({rendimento,inss,dependentes=0}:{rendimento:number;inss:number;dependentes?:number},tabela:TabelaDoIrrf=IRRF_2026):Irrf{
 conferirSalario(rendimento);conferirDependentes(dependentes);
 const baseLegal=Math.max(0,rendimento-inss-tabela.dependente*dependentes);
 const baseSimplificada=Math.max(0,rendimento-tabela.simplificado);
 const modo=baseLegal<baseSimplificada?'legal':'simplificado';
 const base=arredondar(Math.min(baseLegal,baseSimplificada));
 const faixa=faixaDaBase(base,tabela);
 const impostoPelaTabela=faixa.aliquota===0?0:Math.max(0,arredondar(base*faixa.aliquota-faixa.parcelaADeduzir));
 const reducao=reducaoDoImposto(rendimento,impostoPelaTabela,tabela);
 const valor=arredondar(impostoPelaTabela-reducao);
 return {baseLegal,baseSimplificada,base,modo,aliquota:faixa.aliquota,parcelaADeduzir:faixa.parcelaADeduzir,impostoPelaTabela,reducao,valor,aliquotaEfetiva:valor/rendimento};
}

/** Salário líquido do mês: bruto − INSS − IRRF − outros descontos (vale-transporte, plano de saúde…), que não mudam o imposto. */
export function salarioLiquido({bruto,dependentes=0,outrosDescontos=0}:Entrada,tabelas:{inss:TabelaDoInss;irrf:TabelaDoIrrf}={inss:INSS_2026,irrf:IRRF_2026}):Resultado{
 conferirSalario(bruto);conferirDependentes(dependentes);
 if(!Number.isFinite(outrosDescontos)||outrosDescontos<0)throw new RangeError('Os outros descontos não podem ser negativos.');
 const inss=inssDoEmpregado(bruto,tabelas.inss);
 const irrf=irrfMensal({rendimento:bruto,inss:inss.valor,dependentes},tabelas.irrf);
 const descontos=arredondar(inss.valor+irrf.valor+outrosDescontos);
 if(descontos>bruto)throw new RangeError('Os descontos passam do salário: confira os outros descontos.');
 return {bruto,dependentes,inss,irrf,outrosDescontos,descontos,liquido:arredondar(bruto-descontos)};
}
