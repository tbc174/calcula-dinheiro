// Calculadora de férias (férias com um terço, abono pecuniário, adiantamento do 13º, INSS e imposto de renda), Tarefa 21 do
// plano de receita com AdSense (a 3ª das quatro confirmadas pelo Tiago em 29/10/2026). Não há Python do TickerLab para portar:
// os valores esperados saíram de uma implementação independente em Python com aritmética decimal (scratchpad da sessão de
// 29/10/2026); as tabelas de INSS e IRRF de 2026 são as de lib/calculos/salario-liquido.ts.
// Risco 4 do plano: as tabelas carregam `vigenteAte` e este arquivo FALHA quando a data passa. Risco 7: a página existe
// para o site inteiro (inicial, sitemap, SEO), não só como componente.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DIAS_DE_FERIAS,FRACAO_DO_ABONO,MENOR_PERIODO_DE_FERIAS,DIAS_DE_ANTECEDENCIA_DO_PAGAMENTO,TABELA_DE_FALTAS,
 diasDeFeriasPorFaltas,maximoDeDiasVendidos,dataDoPagamento,ferias,
} from '../lib/calculos/ferias.ts';
import {INSS_2026,IRRF_2026,arredondar} from '../lib/calculos/salario-liquido.ts';
import {caminhosPublicos,xmlSitemap,revisoesPorCaminho} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import {conteudos} from '../lib/conteudo.ts';
import config from '../config/publicacao.json' with {type:'json'};

const perto=(a,b,tol=0.005)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);
const DATA=/^\d{4}-\d{2}-\d{2}$/;
const A={bruto:3000};
const B={bruto:3000,diasVendidos:10,dias:20,adiantarDecimo:true};
const D={bruto:8000};

test('as tabelas são as de 2026 do salário líquido e ainda estão vigentes (se falhar: atualize as tabelas, não o teste)',()=>{
 const hoje=new Date().toISOString().slice(0,10);
 for(const t of [INSS_2026,IRRF_2026])assert.ok(hoje<=t.vigenteAte,`tabela ${t.nome} venceu em ${t.vigenteAte}; hoje é ${hoje}`);
 assert.equal(DIAS_DE_FERIAS,30);assert.equal(FRACAO_DO_ABONO,3);assert.equal(MENOR_PERIODO_DE_FERIAS,5);assert.equal(DIAS_DE_ANTECEDENCIA_DO_PAGAMENTO,2);
 assert.deepEqual(TABELA_DE_FALTAS,[{ate:5,dias:30},{ate:14,dias:24},{ate:23,dias:18},{ate:32,dias:12}]);
});

test('dias de férias pela tabela de faltas injustificadas do art. 130 da CLT e abono de até um terço (art. 143)',()=>{
 for(const [faltas,dias] of [[0,30],[5,30],[6,24],[14,24],[15,18],[23,18],[24,12],[32,12],[33,0],[100,0]])assert.equal(diasDeFeriasPorFaltas(faltas),dias,`${faltas} faltas`);
 for(const [direito,maximo] of [[30,10],[24,8],[18,6],[12,4],[0,0]])assert.equal(maximoDeDiasVendidos(direito),maximo,`${direito} dias de direito`);
 assert.equal(dataDoPagamento('2026-12-14'),'2026-12-12','até 2 dias antes do início (art. 145)');
 assert.equal(dataDoPagamento('2027-01-01'),'2026-12-30','o prazo volta o ano');
});

test('R$ 3.000, 30 dias, sem abono: férias com o terço, INSS por faixa sobre os dois, imposto zerado pela redução',()=>{
 const r=ferias(A);
 perto(r.base,3000);assert.equal(r.diasDeDireito,30);assert.equal(r.maximoVendidos,10);assert.equal(r.dias,30);assert.equal(r.diasVendidos,0);
 perto(r.ferias,3000);perto(r.terco,1000);perto(r.abono,0);perto(r.tercoDoAbono,0);perto(r.adiantamento,0);
 perto(r.rendimentoTributavel,4000);perto(r.inss.valor,368.60);assert.equal(r.inss.noTeto,false);perto(r.irrf.valor,0);assert.ok(r.irrf.reducao>0,'o imposto da tabela foi zerado pela redução da Lei 15.270');
 perto(r.verbas,4000);perto(r.descontos,368.60);perto(r.liquido,3631.40);assert.equal(r.pagarAte,null);
 assert.deepEqual(r.linhas.map(l=>[l.rotulo,l.tipo]),[['Férias (30 dias)','verba'],['Terço constitucional','verba'],['INSS','desconto']]);
});

test('R$ 3.000, vende 10 dias e goza 20, com o adiantamento do 13º: abono e adiantamento sem desconto',()=>{
 const r=ferias(B);
 assert.equal(r.dias,20);assert.equal(r.diasVendidos,10);
 perto(r.ferias,2000);perto(r.terco,666.67);perto(r.abono,1000);perto(r.tercoDoAbono,333.33);perto(r.adiantamento,1500);
 perto(r.rendimentoTributavel,2666.67);perto(r.inss.valor,215.69);perto(r.irrf.valor,0);
 perto(r.verbas,5500);perto(r.liquido,5284.31);
 assert.deepEqual(r.linhas.map(l=>l.rotulo),['Férias (20 dias)','Terço constitucional','Abono pecuniário (10 dias)','Terço do abono','Adiantamento do 13º','INSS']);
});

test('R$ 5.000 com 1 dependente, 20 dias desta vez e os outros 10 ficam para depois: nada vendido, dedução do dependente',()=>{
 const r=ferias({bruto:5000,dependentes:1,dias:20});
 perto(r.ferias,3333.33);perto(r.terco,1111.11);perto(r.abono,0);perto(r.rendimentoTributavel,4444.44);
 perto(r.inss.valor,423.74);perto(r.irrf.valor,0);assert.equal(r.irrf.modo,'legal');perto(r.liquido,4020.70);
});

test('R$ 8.000, 30 dias: INSS no teto e imposto de renda sem redução (rendimento acima de R$ 7.350)',()=>{
 const r=ferias(D);
 perto(r.rendimentoTributavel,10_666.67);perto(r.inss.valor,988.09);assert.equal(r.inss.noTeto,true);
 perto(r.irrf.valor,1752.88);assert.equal(r.irrf.aliquota,0.275);perto(r.irrf.reducao,0);perto(r.liquido,7925.70);
});

test('R$ 4.500, 30 dias: redução parcial do imposto (rendimento entre R$ 5.000 e R$ 7.350)',()=>{
 const r=ferias({bruto:4500});
 perto(r.inss.valor,641.51);perto(r.irrf.impostoPelaTabela,564.85);perto(r.irrf.reducao,179.75);perto(r.irrf.valor,385.10);perto(r.liquido,4973.39);
});

test('faltas, médias e fracionamento: 7 faltas dão 24 dias; médias entram na base; 15 dias com abono',()=>{
 const e=ferias({bruto:3000,faltas:7,diasVendidos:8,dias:16});
 assert.equal(e.diasDeDireito,24);assert.equal(e.maximoVendidos,8);perto(e.ferias,1600);perto(e.terco,533.33);perto(e.abono,800);perto(e.tercoDoAbono,266.67);perto(e.inss.valor,167.68);perto(e.liquido,3032.32);
 const f=ferias({bruto:3000,medias:500});
 perto(f.base,3500);perto(f.ferias,3500);perto(f.terco,1166.67);perto(f.inss.valor,454.85);perto(f.irrf.valor,0);perto(f.liquido,4211.82);
 const h=ferias({bruto:2000,diasVendidos:10,dias:15,adiantarDecimo:true,inicio:'2026-12-14'});
 perto(h.ferias,1000);perto(h.terco,333.33);perto(h.abono,666.67);perto(h.tercoDoAbono,222.22);perto(h.adiantamento,1000);// metade do salário, sem as médiasperto(h.inss.valor,100);perto(h.liquido,3122.22);
 assert.equal(h.pagarAte,'2026-12-12');
 const i=ferias({bruto:1500,faltas:30,diasVendidos:4,dias:8});
 assert.equal(i.diasDeDireito,12);assert.equal(i.maximoVendidos,4);perto(i.ferias,400);perto(i.abono,200);perto(i.inss.valor,40);perto(i.liquido,760);
 const padrao=ferias({bruto:3000,diasVendidos:10});
 assert.equal(padrao.dias,20,'sem informar os dias, goza tudo o que não vendeu');
});

test('para qualquer salário, faltas, abono e dias: as linhas somam os totais, nada é negativo, abono e adiantamento não têm desconto',()=>{
 for(const faltas of [0,6,15,24]){
  const direito=diasDeFeriasPorFaltas(faltas),maximo=maximoDeDiasVendidos(direito);
  for(const diasVendidos of [0,maximo]){
   for(const dependentes of [0,2]){
    for(let bruto=500;bruto<=15_000;bruto+=97){
     const semAbono=ferias({bruto,faltas,dependentes}),r=ferias({bruto,faltas,dependentes,diasVendidos,adiantarDecimo:true});
     perto(r.linhas.filter(l=>l.tipo==='verba').reduce((s,l)=>s+l.valor,0),r.verbas,1e-6);
     perto(r.linhas.filter(l=>l.tipo==='desconto').reduce((s,l)=>s+l.valor,0),r.descontos,1e-6);
     perto(r.verbas-r.descontos,r.liquido,1e-6);
     perto(r.ferias+r.terco,r.rendimentoTributavel,1e-6,'só férias e terço são tributados');
     perto(r.inss.valor+r.irrf.valor,r.descontos,1e-6);
     perto(r.terco,arredondar(r.ferias/3),0.011);perto(r.tercoDoAbono,arredondar(r.abono/3),0.011);
     for(const [nome,v] of Object.entries({liquido:r.liquido,ferias:r.ferias,terco:r.terco,abono:r.abono,inss:r.inss.valor,irrf:r.irrf.valor}))assert.ok(v>=-1e-9,`${bruto} ${faltas} faltas: ${nome} negativo`);
     assert.equal(r.dias+r.diasVendidos,direito);
     assert.ok(r.liquido>=semAbono.liquido-1e-9,`${bruto}: vender dias ou adiantar o 13º nunca diminui o que cai na conta`);
     assert.ok(r.liquido<=r.verbas+1e-9);
    }
   }
  }
 }
});

test('erros em português para entradas fora da regra',()=>{
 assert.throws(()=>ferias({bruto:0}),{name:'RangeError',message:/salário bruto maior que zero/});
 assert.throws(()=>ferias({bruto:3000,medias:-1}),{name:'RangeError',message:/médias.*não pode.*negativ/i});
 assert.throws(()=>ferias({bruto:3000,dependentes:1.5}),{name:'RangeError',message:/dependentes.*número inteiro/i});
 assert.throws(()=>ferias({bruto:3000,faltas:-1}),{name:'RangeError',message:/faltas.*número inteiro/i});
 assert.throws(()=>ferias({bruto:3000,faltas:33}),{name:'RangeError',message:/mais de 32 faltas.*não há direito/i});
 assert.throws(()=>ferias({bruto:3000,diasVendidos:11}),{name:'RangeError',message:/vender até 10 dias/});
 assert.throws(()=>ferias({bruto:3000,faltas:7,diasVendidos:9}),{name:'RangeError',message:/vender até 8 dias/});
 assert.throws(()=>ferias({bruto:3000,diasVendidos:2.5}),{name:'RangeError',message:/dias vendidos.*número inteiro/i});
 assert.throws(()=>ferias({bruto:3000,dias:4}),{name:'RangeError',message:/pelo menos 5 dias/});
 assert.throws(()=>ferias({bruto:3000,diasVendidos:10,dias:21}),{name:'RangeError',message:/no máximo 20 dias/});
 assert.throws(()=>ferias({bruto:3000,dias:30.5}),{name:'RangeError',message:/dias de férias.*número inteiro/i});
 assert.throws(()=>ferias({bruto:3000,inicio:'ontem'}),{name:'RangeError',message:/data de início/});
});

test('/ferias está nas ferramentas, nos caminhos públicos e no sitemap com a data de revisão da página',()=>{
 const f=ferramentas.find(x=>x.slug==='ferias');
 assert.ok(f,'ferramenta ferias');
 assert.equal(f.categoria,'Entender os valores');
 assert.ok(caminhosPublicos(config.emailContato).includes('/ferias'));
 const c=conteudos['ferias'];
 assert.match(c.revisadoEm,DATA);
 assert.ok(xmlSitemap(config,revisoesPorCaminho(conteudos)).includes(`<url><loc>${config.origem}/ferias</loc><lastmod>${c.revisadoEm}</lastmod></url>`));
 assert.ok(c.exemplos.length>=2&&c.passos.length>=2&&c.perguntas.length>=3);
 assert.match(c.atencao,/não é previsão nem recomendação/i);
 assert.match(c.atencao,/valores que você digitou/i);
 assert.match(c.atencao,/2026/,'o texto diz de que ano são as tabelas');
 const texto=c.introducao+' '+c.perguntas.map(p=>p.resposta).join(' ');
 assert.match(texto,/um terço/i,'o texto explica o terço constitucional');
 assert.match(texto,/abono/i,'o texto explica o abono pecuniário');
 assert.match(texto,/2 dias/,'o texto diz o prazo de pagamento');
 assert.match(texto,/faltas/i,'o texto explica as faltas que tiram dias');
 assert.match(texto,/13º/,'o texto explica o adiantamento do 13º');
});

// Os exemplos da página saem da mesma conta que a tela usa: o texto não pode mostrar um número que a calculadora não dá.
test('os números dos exemplos da página (3 mil sem abono; 3 mil com abono e 13º; 8 mil com imposto) são os da conta',()=>{
 const semNbsp=s=>s.replace(/ /g,' '); // o Intl separa "R$" do número com espaço duro; o texto da página usa espaço comum
 const texto=semNbsp(conteudos['ferias'].exemplos.map(e=>e.conta+' '+e.leitura).join(' '));
 for(const e of [A,B,D]){
  const r=ferias(e);
  const valores=[r.ferias,r.terco,r.inss.valor,r.liquido,...(r.abono>0?[r.abono,r.tercoDoAbono]:[]),...(r.adiantamento>0?[r.adiantamento]:[]),...(r.irrf.valor>0?[r.irrf.valor]:[])];
  for(const v of valores){
   const esperado=semNbsp(v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
   assert.ok(texto.includes(esperado),`exemplo de ${e.bruto} sem ${esperado}`);
  }
 }
});
