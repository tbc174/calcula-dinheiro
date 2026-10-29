// Calculadora de empréstimo (parcela, juros total e CET), Tarefa 9 do plano de receita com AdSense (a 4ª das quatro da D1).
// Não há Python para portar: os valores esperados saíram de uma implementação independente em Python (scratchpad da
// sessão de 29/10/2026) e das fórmulas das fontes citadas em lib/calculos/emprestimo.ts. Risco 4 do plano: a tabela do IOF
// carrega `vigenteAte` e este arquivo FALHA quando a data passa. Risco 7: a página existe para o site inteiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import {IOF_PESSOA_FISICA,PRAZOS_COMPARADOS,iofDoEmprestimo,cetMensal,simularEmprestimo,compararPrazos} from '../lib/calculos/emprestimo.ts';
import {estadoDaTabela} from '../lib/calculos/salario-liquido.ts';
import {caminhosPublicos,xmlSitemap,revisoesPorCaminho} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import {conteudos} from '../lib/conteudo.ts';
import config from '../config/publicacao.json' with {type:'json'};

const perto=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=Math.max(Math.abs(b)*tol,1e-9),`${a} ≠ ${b}`);
const DATA=/^\d{4}-\d{2}-\d{2}$/;

test('a tabela do IOF diz as alíquotas, o teto de dias, de quando até quando vale e de onde veio',()=>{
 const t=IOF_PESSOA_FISICA;
 assert.equal(t.aliquotaFixa,0.0038);
 assert.equal(t.aliquotaDiaria,0.000082);
 assert.equal(t.diasMaximos,365);
 assert.match(t.vigenteDesde,DATA);assert.match(t.vigenteAte,DATA);
 assert.ok(t.vigenteDesde<t.vigenteAte);
 assert.match(t.fonte,/6\.306/,'fonte oficial: o Decreto 6.306/2007');
});

// Risco 4 do plano: quando este teste falhar, a tabela do IOF venceu. Confira o art. 7º do Decreto 6.306/2007 (texto
// consolidado no Planalto), atualize as alíquotas se mudaram e o vigenteAte; só então ajuste a data aqui.
test('a tabela do IOF ainda está vigente hoje (se falhar: confira o decreto e atualize a tabela, não o teste)',()=>{
 const hoje=new Date().toISOString().slice(0,10);
 assert.ok(hoje<=IOF_PESSOA_FISICA.vigenteAte,`tabela do IOF conferida até ${IOF_PESSOA_FISICA.vigenteAte}; hoje é ${hoje}`);
 assert.equal(estadoDaTabela(new Date('2026-06-15T12:00:00Z'),IOF_PESSOA_FISICA),'vigente');
});

test('IOF por parcela: 0,38% fixo mais 0,0082% por dia sobre cada amortização, dias limitados a 365',()=>{
 perto(iofDoEmprestimo({valor:10_000,taxa:0.02,meses:12}),203.69964615476405);
 perto(iofDoEmprestimo({valor:10_000,taxa:0.02,meses:24}),278.399597862316);
 // Com o prazo todo acima de 365 dias, cada amortização paga o máximo: 0,38% + 0,0082% × 365 = 3,373%.
 const r=simularEmprestimo({valor:10_000,taxa:0.02,meses:24,custos:'descontados'});
 assert.ok(r.iof<10_000*(0.0038+0.000082*365));
 perto(iofDoEmprestimo({valor:1,taxa:0,meses:1}),0.0038+0.000082*30);
});

test('sem tarifa nem IOF, a parcela é a da Price e o CET é a própria taxa',()=>{
 const r=simularEmprestimo({valor:10_000,taxa:0.02,meses:12,tarifa:0,iof:false});
 perto(r.parcela,945.5959662295141);
 perto(r.totalPago,11347.15159475418);
 perto(r.totalJuros,1347.1515947541793);
 perto(r.custoTotal,r.totalJuros);
 assert.equal(r.iof,0);assert.equal(r.tarifa,0);
 perto(r.valorRecebido,10_000);perto(r.valorFinanciado,10_000);
 perto(r.cetMensal,0.02,1e-7);
 perto(r.cetAnual,0.2682417945625455,1e-7);
 perto(r.taxaAnual,0.2682417945625455);
 assert.equal(r.linhas.length,12);
 perto(r.linhas.at(-1).saldo,0);
});

test('custos financiados: você recebe o valor inteiro e o IOF entra no valor financiado (inclusive sobre si mesmo)',()=>{
 const r=simularEmprestimo({valor:5_000,taxa:0.03,meses:12}); // tarifa 0, IOF ligado e financiado: o padrão da tela
 perto(r.valorRecebido,5_000);
 perto(r.valorFinanciado,5105.451529398749);
 perto(r.iof,105.45152939875241);
 perto(iofDoEmprestimo({valor:r.valorFinanciado,taxa:0.03,meses:12}),r.iof,1e-7);
 perto(r.parcela,512.9043079245264);
 perto(r.totalPago,6154.851695094324);
 perto(r.totalJuros,1049.4001656955752);
 perto(r.custoTotal,1154.851695094324);
 perto(r.cetMensal,0.033513796993978384,1e-7);
 perto(r.cetAnual,0.4852355778036219,1e-7);
 perto(r.taxaAnual,0.4257608868461793);
});

test('custos financiados com tarifa: a tarifa e o IOF viram dívida e o CET sobe acima da taxa',()=>{
 const r=simularEmprestimo({valor:20_000,taxa:0.018,meses:36,tarifa:150});
 perto(r.valorFinanciado,20776.922266302554);
 perto(r.iof,626.922266302566);
 assert.equal(r.tarifa,150);
 perto(r.parcela,789.1871215635614);
 perto(r.totalJuros,7633.814109985677);
 perto(r.custoTotal,8410.73637628823);
 perto(r.cetMensal,0.020358926038826053,1e-7);
 perto(r.cetAnual,0.2736075243855427,1e-7);
 assert.ok(r.cetMensal>0.018);
});

test('custos descontados: a dívida é o valor pedido, mas você recebe menos, e o CET é maior do que com os custos financiados',()=>{
 const r=simularEmprestimo({valor:10_000,taxa:0.02,meses:12,tarifa:50,custos:'descontados'});
 perto(r.valorFinanciado,10_000);
 perto(r.iof,203.69964615476405);
 perto(r.valorRecebido,9746.300353845236);
 perto(r.parcela,945.5959662295141);
 perto(r.custoTotal,1600.8512409089435);
 perto(r.cetMensal,0.024209332676169537,1e-7);
 perto(r.cetAnual,0.33249241668671337,1e-7);
 const financiados=simularEmprestimo({valor:10_000,taxa:0.02,meses:12,tarifa:50,custos:'financiados'});
 assert.ok(r.cetMensal>financiados.cetMensal);
});

test('juro zero: parcela é a dívida dividida pelo prazo; só a tarifa ou o IOF fazem o CET sair de zero',()=>{
 const semCustos=simularEmprestimo({valor:1_200,taxa:0,meses:12,iof:false});
 perto(semCustos.parcela,100);perto(semCustos.cetMensal,0);perto(semCustos.cetAnual,0);perto(semCustos.totalJuros,0);
 const comTarifa=simularEmprestimo({valor:1_200,taxa:0,meses:12,tarifa:60,iof:false});
 perto(comTarifa.parcela,105);perto(comTarifa.totalJuros,0);perto(comTarifa.custoTotal,60);
 perto(comTarifa.cetMensal,0.007587184057611274,1e-7);
 perto(comTarifa.cetAnual,0.09494326996412172,1e-7);
 const soIof=simularEmprestimo({valor:1_200,taxa:0,meses:12});
 perto(soIof.iof,24.227461462339136);
 perto(soIof.cetMensal,0.0030886229065413273,1e-7);
});

test('o CET é a taxa que iguala o que você recebeu ao valor presente das parcelas (fluxo de caixa, Resolução CMN 4.881/2020)',()=>{
 const r=simularEmprestimo({valor:20_000,taxa:0.018,meses:36,tarifa:150});
 const valorPresente=r.linhas.reduce((s,l)=>s+l.parcela/Math.pow(1+r.cetMensal,l.mes),0);
 perto(valorPresente,r.valorRecebido,1e-7);
 perto(cetMensal(10_000,Array(12).fill(945.5959662295141)),0.02,1e-7);
 assert.equal(cetMensal(1_200,Array(12).fill(100)),0);
 perto(Math.pow(1+r.cetMensal,12)-1,r.cetAnual);
});

test('a tabela mês a mês: juros sobre o saldo, amortizações que somam a dívida, saldo zerado no fim',()=>{
 const r=simularEmprestimo({valor:20_000,taxa:0.018,meses:36,tarifa:150});
 assert.equal(r.linhas.length,36);
 perto(r.linhas[0].juros,r.valorFinanciado*0.018);
 perto(r.linhas.reduce((s,l)=>s+l.amortizacao,0),r.valorFinanciado);
 perto(r.linhas.reduce((s,l)=>s+l.parcela,0),r.totalPago);
 perto(r.linhas.reduce((s,l)=>s+l.juros,0),r.totalJuros);
 assert.equal(r.linhas.at(-1).saldo,0);
 for(let i=1;i<r.linhas.length;i++)assert.ok(r.linhas[i].juros<r.linhas[i-1].juros,'os juros caem com o saldo');
});

test('em outros prazos: a parcela cai e o custo total sobe quando o prazo cresce',()=>{
 assert.deepEqual(PRAZOS_COMPARADOS,[6,12,24,36,48,60]);
 const lista=compararPrazos({valor:5_000,taxa:0.03,meses:12});
 assert.deepEqual(lista.map(p=>p.meses),PRAZOS_COMPARADOS);
 const esperado={6:[934.79,608.72],12:[512.90,1154.85],24:[303.85,2292.35],36:[236.30,3506.67],48:[204.42,4812.19],60:[186.75,6205.08]};
 for(const p of lista){perto(p.parcela,esperado[p.meses][0],1e-4);perto(p.custoTotal,esperado[p.meses][1],1e-4)}
 for(let i=1;i<lista.length;i++){assert.ok(lista[i].parcela<lista[i-1].parcela);assert.ok(lista[i].custoTotal>lista[i-1].custoTotal)}
 // O prazo digitado entra na lista mesmo quando não é um dos fixos, no lugar certo.
 const comQuinze=compararPrazos({valor:5_000,taxa:0.03,meses:15});
 assert.deepEqual(comQuinze.map(p=>p.meses),[6,12,15,24,36,48,60]);
});

test('entradas inválidas explicam o erro em português',()=>{
 assert.throws(()=>simularEmprestimo({valor:0,taxa:0.02,meses:12}),/valor/);
 assert.throws(()=>simularEmprestimo({valor:1000,taxa:-0.01,meses:12}),/taxa/);
 assert.throws(()=>simularEmprestimo({valor:1000,taxa:1,meses:12}),/taxa/);
 assert.throws(()=>simularEmprestimo({valor:1000,taxa:0.02,meses:0}),/prazo/);
 assert.throws(()=>simularEmprestimo({valor:1000,taxa:0.02,meses:12.5}),/prazo/);
 assert.throws(()=>simularEmprestimo({valor:1000,taxa:0.02,meses:601}),/prazo/);
 assert.throws(()=>simularEmprestimo({valor:1000,taxa:0.02,meses:12,tarifa:-1}),/tarifa/);
 assert.throws(()=>simularEmprestimo({valor:1000,taxa:0.02,meses:12,tarifa:1000,custos:'descontados'}),/tarifa/);
 assert.throws(()=>simularEmprestimo({valor:1000,taxa:0.02,meses:12,custos:'na-conta'}),/custos/);
});

test('propriedades: parcela positiva, dívida paga, CET nunca abaixo da taxa, recebido positivo (milhares de combinações)',()=>{
 let semente=11;const sorteio=()=>{semente=(semente*48271)%2147483647;return semente/2147483647};
 for(let i=0;i<3000;i++){
  const valor=100+sorteio()*500_000,taxa=sorteio()<.1?0:sorteio()*0.12,meses=1+Math.floor(sorteio()*120);
  const tarifa=sorteio()<.3?0:sorteio()*valor*0.05,iof=sorteio()<.8,custos=sorteio()<.5?'financiados':'descontados';
  const r=simularEmprestimo({valor,taxa,meses,tarifa,iof,custos});
  assert.ok(r.parcela>0&&r.valorRecebido>0,'parcela e recebido positivos');
  assert.ok(r.cetMensal>=taxa-1e-9,`CET ${r.cetMensal} abaixo da taxa ${taxa}`);
  assert.ok(Number.isFinite(r.cetAnual)&&r.cetAnual>=0);
  perto(r.linhas.reduce((s,l)=>s+l.amortizacao,0),r.valorFinanciado,1e-8);
  assert.equal(r.linhas.at(-1).saldo,0);
  if(custos==='financiados')perto(r.valorRecebido,valor);else perto(r.valorFinanciado,valor);
  if(!iof)assert.equal(r.iof,0);
  if(tarifa===0&&!iof)perto(r.cetMensal,taxa,1e-7);
 }
});

test('a página de empréstimo está em caminhosPublicos e no sitemap com a sua revisão, com a frase de honestidade (riscos 5 e 7)',()=>{
 const f=ferramentas.find(x=>x.slug==='emprestimo');
 assert.ok(f,'ferramenta emprestimo');
 assert.equal(f.categoria,'Comprar e comparar');
 assert.ok(caminhosPublicos(config.emailContato).includes('/emprestimo'));
 const c=conteudos.emprestimo;
 assert.match(c.revisadoEm,DATA);
 assert.ok(xmlSitemap(config,revisoesPorCaminho(conteudos)).includes(`<url><loc>${config.origem}/emprestimo</loc><lastmod>${c.revisadoEm}</lastmod></url>`));
 assert.ok(c.exemplos.length>=2&&c.passos.length>=2&&c.perguntas.length>=3);
 assert.match(c.atencao,/não é previsão nem recomendação/i);
 assert.match(c.atencao,/valores que você digitou/i);
 assert.match(c.atencao,/oferta de crédito/i,'o texto diz que não é oferta de crédito');
});

// Os exemplos da página saem da mesma conta que a tela usa: o texto não pode mostrar um número que a calculadora não dá.
test('os números dos exemplos da página (5 mil em 12×; 20 mil em 36× com tarifa; 10 mil em 24× sem custos) são os da conta',()=>{
 const semNbsp=s=>s.replace(/ /g,' '); // o Intl separa "R$" do número com espaço duro; o texto da página usa espaço comum
 const texto=semNbsp(conteudos.emprestimo.exemplos.map(e=>e.conta+' '+e.leitura).join(' '));
 const reais=v=>semNbsp(v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
 const porCento=v=>(v*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
 const casos=[{valor:5_000,taxa:0.03,meses:12},{valor:20_000,taxa:0.018,meses:36,tarifa:150},{valor:10_000,taxa:0.025,meses:24,iof:false}];
 for(const caso of casos){
  const r=simularEmprestimo(caso);
  for(const v of [r.parcela,r.totalJuros,r.custoTotal])assert.ok(texto.includes(reais(v)),`exemplo de ${caso.valor} sem ${reais(v)}`);
  assert.ok(texto.includes(porCento(r.cetAnual)),`exemplo de ${caso.valor} sem o CET de ${porCento(r.cetAnual)} ao ano`);
 }
});
