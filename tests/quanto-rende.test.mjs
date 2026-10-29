// Calculadora "quanto rende" (poupança × CDB × LCI/LCA × Tesouro Selic), Tarefa 9 do plano de receita com AdSense
// (a 2ª das quatro da D1). A conta é portada de src/ferramentas/renda_fixa.py do TickerLab: os valores esperados
// aqui saíram do Python (teste de igualdade, risco 4 do plano). Também confere o risco 7: a página nova está em
// caminhosPublicos e no sitemap com a sua data de revisão.
import test from 'node:test';
import assert from 'node:assert/strict';
import {comparar,cdbQueEmpata,aliquotaDaRendaFixa,aliquotaDoIof,poupancaAoMes,diasDoPrazo,DIAS_MAXIMOS,ISENTO_DE_CUSTODIA_ATE} from '../lib/calculos/quanto-rende.ts';
import {caminhosPublicos,xmlSitemap,revisoesPorCaminho} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import {conteudos} from '../lib/conteudo.ts';
import config from '../config/publicacao.json' with {type:'json'};

const perto=(a,b,rel=1e-9)=>assert.ok(Math.abs(a-b)<=Math.max(Math.abs(b)*rel,1e-6),`${a} ≠ ${b}`);
const CDI=[0.1465],POUPANCA=0.005;
const base=(valor,dias,extra={})=>({valor,dias,cdiPorAno:CDI,percentualDoCdb:1,percentualDaLci:0.9,poupancaAoMes:POUPANCA,...extra});
const porNome=(opcoes)=>Object.fromEntries(opcoes.map(o=>[o.nome,o]));

test('as quatro opções saem nesta ordem, com os mesmos nomes do Python',()=>{
 assert.deepEqual(comparar(base(10_000,730)).map(o=>o.nome),['CDB','LCI ou LCA','Tesouro Selic','Poupança']);
});

test('10 mil por 2 anos: CDB a 100% do CDI, LCI a 90%, Selic com custódia e poupança iguais ao Python',()=>{
 const o=porNome(comparar(base(10_000,730)));
 perto(o.CDB.bruto,13144.6225);perto(o.CDB.aliquota,0.15);perto(o.CDB.imposto,471.693375);perto(o.CDB.liquido,12672.929125);
 perto(o['LCI ou LCA'].bruto,12790.166701);perto(o['LCI ou LCA'].liquido,12790.166701);assert.equal(o['LCI ou LCA'].imposto,0);assert.equal(o['LCI ou LCA'].isento,true);
 perto(o['Tesouro Selic'].bruto,13144.6225);perto(o['Tesouro Selic'].imposto,471.693375);perto(o['Tesouro Selic'].custodia,6.289245);perto(o['Tesouro Selic'].liquido,12666.639880);
 perto(o['Poupança'].bruto,11271.597762);perto(o['Poupança'].liquido,11271.597762);assert.equal(o['Poupança'].isento,true);
 perto(cdbQueEmpata(10_000,730,CDI,0.9),1.038186603711614,1e-7);
});

test('1 mil por 30 dias: alíquota de 22,5%, sem IOF, um aniversário da poupança',()=>{
 const o=porNome(comparar(base(1_000,30)));
 perto(o.CDB.bruto,1011.300122);perto(o.CDB.aliquota,0.225);perto(o.CDB.iof,0);perto(o.CDB.imposto,2.542527,1e-6);perto(o.CDB.liquido,1008.757595);
 perto(o['LCI ou LCA'].liquido,1010.164664);
 perto(o['Tesouro Selic'].custodia,0);perto(o['Tesouro Selic'].liquido,o.CDB.liquido); // até 10 mil a custódia é isenta
 perto(o['Poupança'].liquido,1005);
 perto(cdbQueEmpata(1_000,30,CDI,0.9),1.1596761756538418,1e-7);
});

test('5 mil por 15 dias: o IOF come metade do rendimento e o imposto incide no que sobra',()=>{
 const o=porNome(comparar(base(5_000,15)));
 perto(o.CDB.bruto,5028.170945);perto(o.CDB.iof,14.085472,1e-6);perto(o.CDB.imposto,3.169231,1e-6);perto(o.CDB.liquido,5010.916241);
 perto(o['LCI ou LCA'].liquido,5025.347412);assert.equal(o['LCI ou LCA'].iof,0);
 perto(o['Poupança'].liquido,5000); // sem aniversário, a poupança não rende
 perto(cdbQueEmpata(5_000,15,CDI,0.9),2.3142505099948396,1e-7);
});

test('10 mil por 10 dias: IOF de 66% do rendimento (caso dos testes do Python)',()=>{
 const o=porNome(comparar(base(10_000,10)));
 perto(o.CDB.bruto,10037.526077);perto(o.CDB.iof,24.767211,1e-6);perto(o.CDB.imposto,2.870745,1e-6);perto(o.CDB.liquido,10009.888121);
 perto(o['Tesouro Selic'].custodia,0.001028,1e-3);perto(o['Tesouro Selic'].liquido,10009.887093);
 perto(cdbQueEmpata(10_000,10,CDI,0.9),3.4018927298404007,1e-7);
});

test('50 mil por 1 ano: CDB a 110%, LCI a 85%, custódia do Selic sobre o que passa de 10 mil',()=>{
 const o=porNome(comparar(base(50_000,365,{percentualDoCdb:1.1,percentualDaLci:0.85})));
 perto(o.CDB.bruto,58113.856689);perto(o.CDB.aliquota,0.175);perto(o.CDB.imposto,1419.924921);perto(o.CDB.liquido,56693.931768);
 perto(o['LCI ou LCA'].liquido,56161.669281);
 perto(o['Tesouro Selic'].bruto,57325);perto(o['Tesouro Selic'].imposto,1281.875);perto(o['Tesouro Selic'].custodia,87.325);perto(o['Tesouro Selic'].liquido,55955.8);
 perto(o['Poupança'].liquido,53083.890593);
 perto(cdbQueEmpata(50_000,365,CDI,0.85),1.0183166646178679,1e-7);
});

test('20 mil por 3 anos com o CDI caindo (14,65%, 12%, 10%): um CDI por ano, alíquota de 15%',()=>{
 const o=porNome(comparar(base(20_000,1095,{cdiPorAno:[0.1465,0.12,0.10]})));
 perto(o.CDB.bruto,28249.76);perto(o.CDB.aliquota,0.15);perto(o.CDB.imposto,1237.464);perto(o.CDB.liquido,27012.296);
 perto(o['LCI ou LCA'].liquido,27290.999125);
 perto(o['Tesouro Selic'].custodia,84.74928);perto(o['Tesouro Selic'].liquido,26927.54672);
 perto(o['Poupança'].liquido,23933.610496);
 perto(cdbQueEmpata(20_000,1095,[0.1465,0.12,0.10],0.9),1.0334227194292858,1e-7);
});

test('100 mil por 181 dias: alíquota cai para 20% e o Selic (100% do CDI) rende menos que o CDB a 105%',()=>{
 const o=porNome(comparar(base(100_000,181,{cdiPorAno:[0.15],percentualDoCdb:1.05})));
 perto(o.CDB.bruto,107548.414603);perto(o.CDB.aliquota,0.2);perto(o.CDB.imposto,1509.682921);perto(o.CDB.liquido,106038.731682);
 perto(o['LCI ou LCA'].liquido,106436.425345);
 perto(o['Tesouro Selic'].bruto,107176.47694);perto(o['Tesouro Selic'].custodia,92.81902);perto(o['Tesouro Selic'].liquido,105648.362532);
 perto(o['Poupança'].liquido,103037.750939);
 perto(cdbQueEmpata(100_000,181,[0.15],0.9),1.1165608298926113,1e-7);
});

test('tabela regressiva do IR e tabela do IOF nas bordas',()=>{
 for(const [dias,aliquota] of [[1,0.225],[180,0.225],[181,0.2],[360,0.2],[361,0.175],[720,0.175],[721,0.15],[3650,0.15]])assert.equal(aliquotaDaRendaFixa(dias),aliquota,`${dias} dias`);
 assert.equal(aliquotaDoIof(1),0.96);assert.equal(aliquotaDoIof(15),0.5);assert.equal(aliquotaDoIof(29),0.03);assert.equal(aliquotaDoIof(30),0);assert.equal(aliquotaDoIof(400),0);
});

test('o CDB que empata com a LCI não existe quando nenhum percentual até 1000% do CDI alcança (prazo de 2 dias)',()=>{
 assert.equal(cdbQueEmpata(10_000,2,CDI,0.9),null);
});

test('regra da poupança: 0,5% ao mês com a Selic acima de 8,5% ao ano; senão 70% da Selic ao ano, dividido por 12',()=>{
 assert.equal(poupancaAoMes(0.1465),0.005);assert.equal(poupancaAoMes(0.0851),0.005);
 perto(poupancaAoMes(0.085),0.7*0.085/12);perto(poupancaAoMes(0.06),0.0035);
 assert.throws(()=>poupancaAoMes(-0.01),RangeError);
});

test('o prazo em meses ou anos vira dias corridos pelo ano de 365 dias',()=>{
 assert.equal(diasDoPrazo(1,'ano'),365);assert.equal(diasDoPrazo(2,'ano'),730);assert.equal(diasDoPrazo(12,'mes'),365);
 assert.equal(diasDoPrazo(1,'mes'),30);assert.equal(diasDoPrazo(6,'mes'),183);assert.equal(diasDoPrazo(45,'dia'),45);
 assert.throws(()=>diasDoPrazo(1,'semana'),RangeError);
});

test('para qualquer entrada, o líquido nunca passa do bruto e a opção isenta não paga nada',()=>{
 for(const valor of [1,1_000,10_000,250_000])for(const dias of [1,29,30,180,181,365,720,721,DIAS_MAXIMOS])for(const cdi of [0,0.05,0.1465,0.3]){
  for(const o of comparar(base(valor,dias,{cdiPorAno:[cdi]}))){
   assert.ok(o.liquido<=o.bruto+1e-9,`${o.nome} ${valor} ${dias} ${cdi}: líquido acima do bruto`);
   assert.ok(o.bruto>=valor-1e-9,`${o.nome} ${valor} ${dias} ${cdi}: bruto abaixo do aplicado`);
   if(o.isento)assert.equal(o.iof+o.imposto+o.custodia,0,`${o.nome}: isento com desconto`);
  }
 }
 assert.equal(ISENTO_DE_CUSTODIA_ATE,10_000);
});

test('erros em português para entradas fora da regra',()=>{
 assert.throws(()=>comparar(base(-1,30)),{name:'RangeError',message:/não pode ser negativo/});
 assert.throws(()=>comparar(base(1_000,0)),{name:'RangeError',message:/entre 1 e 3650 dias/});
 assert.throws(()=>comparar(base(1_000,DIAS_MAXIMOS+1)),{name:'RangeError',message:/entre 1 e 3650 dias/});
 assert.throws(()=>comparar(base(1_000,30.5)),{name:'RangeError',message:/entre 1 e 3650 dias/});
 assert.throws(()=>comparar(base(1_000,30,{cdiPorAno:[]})),{name:'RangeError',message:/CDI de pelo menos um ano/});
 assert.throws(()=>comparar(base(1_000,30,{percentualDoCdb:-0.1})),{name:'RangeError',message:/percentual do CDI não pode ser negativo/});
 assert.throws(()=>comparar(base(1_000,30,{poupancaAoMes:-0.001})),{name:'RangeError',message:/poupança não pode ser negativa/});
});

// Risco 7 do plano: a página nova existe para o site inteiro (inicial, sitemap, SEO), não só como componente.
test('/quanto-rende está nas ferramentas, nos caminhos públicos e no sitemap com a data de revisão da página',()=>{
 const f=ferramentas.find(x=>x.slug==='quanto-rende');
 assert.ok(f,'ferramenta quanto-rende');
 assert.equal(f.categoria,'Guardar e planejar');
 assert.ok(caminhosPublicos(config.emailContato).includes('/quanto-rende'));
 const c=conteudos['quanto-rende'];
 assert.match(c.revisadoEm,/^\d{4}-\d{2}-\d{2}$/);
 assert.ok(xmlSitemap(config,revisoesPorCaminho(conteudos)).includes(`<url><loc>${config.origem}/quanto-rende</loc><lastmod>${c.revisadoEm}</lastmod></url>`));
 assert.ok(c.exemplos.length>=2&&c.passos.length>=2&&c.perguntas.length>=3);
 assert.match(c.atencao,/não é previsão nem recomendação/i);
 assert.match(c.atencao,/taxa que você digitou/i);
});

// Os exemplos da página saem da mesma conta que a tela usa: o texto não pode mostrar um número que a calculadora não dá.
test('os números do 1º exemplo da página (10 mil por 2 anos) são os da conta',()=>{
 const dois=porNome(comparar(base(10_000,730)));
 const semNbsp=s=>s.replace(/ /g,' '); // o Intl separa "R$" do número com espaço duro; o texto da página usa espaço comum
 const texto=semNbsp(conteudos['quanto-rende'].exemplos.map(e=>e.conta+' '+e.leitura).join(' '));
 for(const v of [dois.CDB.liquido,dois['LCI ou LCA'].liquido,dois['Tesouro Selic'].liquido,dois['Poupança'].liquido]){
  const esperado=semNbsp(v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
  assert.ok(texto.includes(esperado),`exemplo sem ${esperado}`);
 }
});
