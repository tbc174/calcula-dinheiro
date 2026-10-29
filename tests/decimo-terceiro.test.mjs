// Calculadora de 13º salário (1ª e 2ª parcela, proporcional pelos avos, INSS e imposto de renda sobre o 13º inteiro),
// Tarefa 19 do plano de receita com AdSense (a 1ª das quatro confirmadas pelo Tiago em 29/10/2026). Não há Python do
// TickerLab para portar: os valores esperados saíram de uma implementação independente em Python com aritmética decimal
// (scratchpad da sessão de 29/10/2026), e as tabelas de INSS e IRRF de 2026 são as mesmas de lib/calculos/salario-liquido.ts.
// Risco 4 do plano: as tabelas carregam `vigenteAte` e este arquivo FALHA quando a data passa. Risco 7: a página existe
// para o site inteiro (inicial, sitemap, SEO), não só como componente.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DIAS_PARA_CONTAR_O_MES,MESES_DO_ANO,ANO_DAS_TABELAS,mesesComDireito,avosDoAno,prazoDaPrimeiraParcela,prazoDaSegundaParcela,decimoTerceiro,
} from '../lib/calculos/decimo-terceiro.ts';
import {INSS_2026,IRRF_2026,arredondar} from '../lib/calculos/salario-liquido.ts';
import {caminhosPublicos,xmlSitemap,revisoesPorCaminho} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import {conteudos} from '../lib/conteudo.ts';
import config from '../config/publicacao.json' with {type:'json'};

const perto=(a,b,tol=0.005)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);
const DATA=/^\d{4}-\d{2}-\d{2}$/;
const ANO_TODO='2026-01-01';

test('as tabelas são as de 2026 do salário líquido e ainda estão vigentes (se falhar: atualize as tabelas, não o teste)',()=>{
 assert.equal(ANO_DAS_TABELAS,2026);
 assert.equal(INSS_2026.vigenteDesde.slice(0,4),String(ANO_DAS_TABELAS));
 const hoje=new Date().toISOString().slice(0,10);
 for(const t of [INSS_2026,IRRF_2026])assert.ok(hoje<=t.vigenteAte,`tabela ${t.nome} venceu em ${t.vigenteAte}; hoje é ${hoje}`);
 assert.equal(prazoDaPrimeiraParcela(2026),'2026-11-30');
 assert.equal(prazoDaSegundaParcela(2026),'2026-12-20');
});

test('avos: a fração de 15 dias ou mais de trabalho no mês conta como mês inteiro (Lei 4.090/1962, art. 1º, § 2º)',()=>{
 assert.equal(DIAS_PARA_CONTAR_O_MES,15);assert.equal(MESES_DO_ANO,12);
 assert.equal(avosDoAno('2025-06-01',2026),12,'admitido em ano anterior: ano inteiro');
 assert.equal(avosDoAno('2026-01-01',2026),12);
 assert.equal(avosDoAno('2026-04-10',2026),9,'abril com 21 dias conta');
 assert.equal(avosDoAno('2026-04-16',2026),9,'abril com exatamente 15 dias conta');
 assert.equal(avosDoAno('2026-04-17',2026),8,'abril com 14 dias não conta');
 assert.equal(avosDoAno('2026-02-14',2026),11,'fevereiro de 28 dias: do dia 14 ao 28 são 15 dias');
 assert.equal(avosDoAno('2026-02-15',2026),10);
 assert.equal(avosDoAno('2026-12-17',2026),1,'dezembro do dia 17 ao 31 são 15 dias');
 assert.equal(avosDoAno('2026-12-18',2026),0);
 assert.equal(avosDoAno('2027-01-01',2026),0,'admitido depois do ano');
 const meses=mesesComDireito('2026-04-10',2026);
 assert.equal(meses.length,12);
 assert.deepEqual(meses[2],{mes:3,dias:0,conta:false});
 assert.deepEqual(meses[3],{mes:4,dias:21,conta:true});
 assert.deepEqual(meses[11],{mes:12,dias:31,conta:true});
});

test('13º integral de R$ 3.000: metade em novembro sem desconto; em dezembro, o resto menos o INSS e o imposto sobre o total',()=>{
 const r=decimoTerceiro({bruto:3000,admissao:ANO_TODO});
 assert.equal(r.avos,12);perto(r.valor,3000);perto(r.primeiraParcela,1500);assert.equal(r.adiantamentoInformado,false);
 perto(r.inss.valor,248.60);perto(r.irrf.valor,0);assert.equal(r.irrf.modo,'simplificado');perto(r.irrf.base,2392.80);
 perto(r.descontos,248.60);perto(r.segundaParcela,1251.40);perto(r.liquido,2751.40);
 perto(r.primeiraParcela+r.segundaParcela,r.liquido,1e-9);
 assert.equal(r.ano,2026);
});

test('casos de referência com as tabelas de 2026 (INSS e imposto de renda sobre o 13º inteiro, separados do salário)',()=>{
 const casos=[
  // [bruto, dependentes, INSS, IRRF, redução, 2ª parcela, líquido]
  [1621,0,121.58,0,0,688.92,1499.42], // salário mínimo de 2026
  [5000,0,501.51,0,312.89,1998.49,4498.49], // imposto pela tabela de R$ 312,89, zerado pela redução da Lei 15.270/2025
  [6000,1,641.51,332.97,179.75,2025.52,5025.52],
  [7200,0,809.51,828.67,19.98,1961.82,5561.82],
  [8475.55,0,988.09,1150.32,0,2099.36,6337.14], // no teto do INSS
  [10_000,2,988.09,1465.27,0,2546.64,7546.64], // acima do teto, sem redução
 ];
 for(const [bruto,dependentes,inss,irrf,reducao,segunda,liquido] of casos){
  const r=decimoTerceiro({bruto,dependentes,admissao:ANO_TODO});
  perto(r.inss.valor,inss);perto(r.irrf.valor,irrf);perto(r.irrf.reducao,reducao);perto(r.segundaParcela,segunda);perto(r.liquido,liquido);
  perto(r.primeiraParcela,arredondar(bruto/2));
 }
 assert.equal(decimoTerceiro({bruto:10_000,admissao:ANO_TODO}).inss.noTeto,true);
});

test('13º proporcional: R$ 3.000 para quem entrou em 10/04 são 9 avos, e os descontos saem do valor proporcional',()=>{
 const r=decimoTerceiro({bruto:3000,admissao:'2026-04-10'});
 assert.equal(r.avos,9);perto(r.valor,2250);perto(r.primeiraParcela,1125);
 perto(r.inss.valor,178.19);perto(r.irrf.valor,0);perto(r.segundaParcela,946.81);perto(r.liquido,2071.81);
 const meio=decimoTerceiro({bruto:4500,dependentes:1,admissao:'2026-07-01'});
 assert.equal(meio.avos,6);perto(meio.valor,2250);perto(meio.inss.valor,178.19);perto(meio.segundaParcela,946.81);
 const umAvo=decimoTerceiro({bruto:3000,admissao:'2026-12-17'});
 assert.equal(umAvo.avos,1);perto(umAvo.valor,250);perto(umAvo.inss.valor,18.75);perto(umAvo.segundaParcela,106.25);
});

test('médias de horas extras, comissões e adicionais entram na base do 13º',()=>{
 const r=decimoTerceiro({bruto:3000,medias:500,admissao:ANO_TODO});
 perto(r.base,3500);perto(r.valor,3500);perto(r.primeiraParcela,1750);
 perto(r.inss.valor,308.60);perto(r.irrf.impostoPelaTabela,39.76);perto(r.irrf.reducao,39.76);perto(r.irrf.valor,0);
 perto(r.segundaParcela,1441.40);perto(r.liquido,3191.40);
});

test('1ª parcela já recebida: o valor informado substitui a metade e muda só a 2ª parcela',()=>{
 const r=decimoTerceiro({bruto:3000,admissao:ANO_TODO,adiantamento:1400});
 assert.equal(r.adiantamentoInformado,true);perto(r.primeiraParcela,1400);perto(r.segundaParcela,1351.40);perto(r.liquido,2751.40);
 const semAdiantamento=decimoTerceiro({bruto:3000,admissao:ANO_TODO,adiantamento:0});
 perto(semAdiantamento.primeiraParcela,0);perto(semAdiantamento.segundaParcela,semAdiantamento.liquido,1e-9);
 const padrao=decimoTerceiro({bruto:3000,admissao:ANO_TODO,adiantamento:null});
 perto(padrao.primeiraParcela,1500);assert.equal(padrao.adiantamentoInformado,false);
});

test('para qualquer salário e qualquer número de avos: as parcelas somam o líquido, nada passa do 13º e ganhar mais nunca deixa menos',()=>{
 for(const admissao of [ANO_TODO,'2026-05-01','2026-11-01']){
  for(const dependentes of [0,1,2]){
   let anterior=0;
   for(let bruto=500;bruto<=15_000;bruto+=7){
    const r=decimoTerceiro({bruto,dependentes,admissao});
    perto(r.valor,arredondar(bruto*r.avos/MESES_DO_ANO),1e-9);
    perto(r.primeiraParcela+r.segundaParcela,r.liquido,1e-6);
    assert.ok(r.segundaParcela>0&&r.liquido<=r.valor,`${bruto} (${admissao}): parcela ou líquido fora do 13º`);
    assert.ok(r.inss.valor<=988.09+1e-9&&r.irrf.valor>=0,`${bruto}: INSS acima do teto ou imposto negativo`);
    assert.ok(r.liquido>=anterior-1e-9,`${bruto} (${admissao}, ${dependentes} dep.): líquido caiu (${anterior} → ${r.liquido})`);
    anterior=r.liquido;
   }
  }
 }
});

test('erros em português para entradas fora da regra',()=>{
 assert.throws(()=>decimoTerceiro({bruto:0,admissao:ANO_TODO}),{name:'RangeError',message:/salário bruto maior que zero/});
 assert.throws(()=>decimoTerceiro({bruto:3000,dependentes:1.5,admissao:ANO_TODO}),{name:'RangeError',message:/dependentes.*número inteiro/i});
 assert.throws(()=>decimoTerceiro({bruto:3000,medias:-1,admissao:ANO_TODO}),{name:'RangeError',message:/médias não podem ser negativas/});
 assert.throws(()=>decimoTerceiro({bruto:3000,admissao:'ontem'}),{name:'RangeError',message:/data de admissão/});
 assert.throws(()=>decimoTerceiro({bruto:3000,admissao:'2026-12-18'}),{name:'RangeError',message:/nenhum mês de 2026/});
 assert.throws(()=>decimoTerceiro({bruto:3000,admissao:'2027-02-01'}),{name:'RangeError',message:/nenhum mês de 2026/});
 assert.throws(()=>decimoTerceiro({bruto:3000,admissao:ANO_TODO,adiantamento:-5}),{name:'RangeError',message:/1ª parcela não pode ser negativa/});
 assert.throws(()=>decimoTerceiro({bruto:3000,admissao:ANO_TODO,adiantamento:2900}),{name:'RangeError',message:/1ª parcela.*maior que o 13º/});
});

// Risco 7 do plano: a página nova existe para o site inteiro (inicial, sitemap, SEO), não só como componente.
test('/decimo-terceiro está nas ferramentas, nos caminhos públicos e no sitemap com a data de revisão da página',()=>{
 const f=ferramentas.find(x=>x.slug==='decimo-terceiro');
 assert.ok(f,'ferramenta decimo-terceiro');
 assert.equal(f.categoria,'Entender os valores');
 assert.ok(caminhosPublicos(config.emailContato).includes('/decimo-terceiro'));
 const c=conteudos['decimo-terceiro'];
 assert.match(c.revisadoEm,DATA);
 assert.ok(xmlSitemap(config,revisoesPorCaminho(conteudos)).includes(`<url><loc>${config.origem}/decimo-terceiro</loc><lastmod>${c.revisadoEm}</lastmod></url>`));
 assert.ok(c.exemplos.length>=2&&c.passos.length>=2&&c.perguntas.length>=3);
 assert.match(c.atencao,/não é previsão nem recomendação/i);
 assert.match(c.atencao,/valores que você digitou/i);
 assert.match(c.atencao,/2026/,'o texto diz de que ano são as tabelas');
 assert.match(c.introducao+c.perguntas.map(p=>p.resposta).join(' '),/30 de novembro|30\/11/,'o texto diz o prazo da 1ª parcela');
 assert.match(c.introducao+c.perguntas.map(p=>p.resposta).join(' '),/20 de dezembro|20\/12/,'o texto diz o prazo da 2ª parcela');
});

// Os exemplos da página saem da mesma conta que a tela usa: o texto não pode mostrar um número que a calculadora não dá.
test('os números dos exemplos da página (3 mil o ano todo; 6 mil com 1 dependente; 3 mil desde 10/04) são os da conta',()=>{
 const semNbsp=s=>s.replace(/ /g,' '); // o Intl separa "R$" do número com espaço duro; o texto da página usa espaço comum
 const texto=semNbsp(conteudos['decimo-terceiro'].exemplos.map(e=>e.conta+' '+e.leitura).join(' '));
 for(const [bruto,dependentes,admissao] of [[3000,0,ANO_TODO],[6000,1,ANO_TODO],[3000,0,'2026-04-10']]){
  const r=decimoTerceiro({bruto,dependentes,admissao});
  for(const v of [r.valor,r.primeiraParcela,r.segundaParcela,r.inss.valor,...(r.irrf.valor>0?[r.irrf.valor]:[])]){
   const esperado=semNbsp(v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
   assert.ok(texto.includes(esperado),`exemplo de ${bruto} (${admissao}) sem ${esperado}`);
  }
 }
});
