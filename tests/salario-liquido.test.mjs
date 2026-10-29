// Calculadora "salário líquido" (INSS por faixa e IRRF com dependentes, desconto simplificado e a redução da Lei
// 15.270/2025), Tarefa 9 do plano de receita com AdSense (a 3ª das quatro da D1). Não há Python para portar: as tabelas
// vêm das fontes oficiais citadas em lib/calculos/salario-liquido.ts e os valores esperados foram conferidos em aritmética
// decimal exata e nos exemplos publicados pela Receita Federal. Risco 4 do plano: a tabela carrega `vigenteAte` e este
// arquivo FALHA quando a data passa, para ninguém esquecer de atualizar. Risco 7: a página existe para o site inteiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import {INSS_2026,IRRF_2026,DIAS_DE_AVISO,inssDoEmpregado,irrfMensal,salarioLiquido,estadoDaTabela} from '../lib/calculos/salario-liquido.ts';
import {caminhosPublicos,xmlSitemap,revisoesPorCaminho} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import {conteudos} from '../lib/conteudo.ts';
import config from '../config/publicacao.json' with {type:'json'};

const perto=(a,b,tol=0.005)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);
const DATA=/^\d{4}-\d{2}-\d{2}$/;

test('as tabelas dizem de quando até quando valem e de onde vieram',()=>{
 for(const t of [INSS_2026,IRRF_2026]){
  assert.match(t.vigenteDesde,DATA);assert.match(t.vigenteAte,DATA);
  assert.ok(t.vigenteDesde<t.vigenteAte);
  assert.ok(t.fonte.length>20,'fonte oficial escrita na tabela');
 }
 assert.equal(INSS_2026.teto,8475.55);
 assert.equal(IRRF_2026.dependente,189.59);assert.equal(IRRF_2026.simplificado,607.20);
});

// Risco 4 do plano: quando este teste falhar, as tabelas venceram. Confira a portaria do INSS e a tabela da Receita do ano
// novo, atualize INSS_2026/IRRF_2026 (ou crie as do ano seguinte) e o vigenteAte; só então ajuste a data aqui.
test('as tabelas de INSS e IRRF ainda estão vigentes hoje (se falhar: atualize as tabelas, não o teste)',()=>{
 const hoje=new Date().toISOString().slice(0,10);
 for(const t of [INSS_2026,IRRF_2026])assert.ok(hoje<=t.vigenteAte,`tabela ${t.nome} venceu em ${t.vigenteAte}; hoje é ${hoje}`);
});

test('o estado da tabela por data: vigente, perto do fim (30 dias) ou fora da vigência',()=>{
 assert.equal(DIAS_DE_AVISO,30);
 assert.equal(estadoDaTabela(new Date('2026-06-15T12:00:00Z'),INSS_2026),'vigente');
 assert.equal(estadoDaTabela(new Date('2026-12-01T12:00:00Z'),INSS_2026),'vigente');
 assert.equal(estadoDaTabela(new Date('2026-12-02T12:00:00Z'),INSS_2026),'perto-do-fim');
 assert.equal(estadoDaTabela(new Date('2026-12-31T12:00:00Z'),INSS_2026),'perto-do-fim');
 assert.equal(estadoDaTabela(new Date('2027-01-01T12:00:00Z'),INSS_2026),'fora-da-vigencia');
 assert.equal(estadoDaTabela(new Date('2025-12-31T12:00:00Z'),INSS_2026),'fora-da-vigencia');
});

test('INSS por faixa: cada alíquota só sobre a fatia do salário dentro da faixa (Portaria MPS/MF 13/2026)',()=>{
 const minimo=inssDoEmpregado(1621);
 perto(minimo.valor,121.58);assert.equal(minimo.faixas.length,1);perto(minimo.faixas[0].base,1621);
 const tres=inssDoEmpregado(3000);
 perto(tres.valor,248.60);assert.equal(tres.faixas.length,3);
 perto(tres.faixas[0].valor,121.575,1e-6);perto(tres.faixas[1].valor,115.3656,1e-6);perto(tres.faixas[2].base,97.16);perto(tres.faixas[2].valor,11.6592,1e-6);
 assert.deepEqual(tres.faixas.map(f=>f.aliquota),[0.075,0.09,0.12]);
 perto(inssDoEmpregado(5000).valor,501.51);
 perto(inssDoEmpregado(7200).valor,809.51);
});

test('INSS para no teto: acima de R$ 8.475,55 o desconto é sempre R$ 988,09',()=>{
 perto(inssDoEmpregado(8475.55).valor,988.09);
 perto(inssDoEmpregado(10_000).valor,988.09);
 perto(inssDoEmpregado(50_000).valor,988.09);
 perto(inssDoEmpregado(10_000).aliquotaEfetiva,0.098809,1e-6);
 assert.equal(inssDoEmpregado(10_000).noTeto,true);assert.equal(inssDoEmpregado(3000).noTeto,false);
});

// Os três exemplos da própria Receita Federal ("Exemplos de aplicação da Lei 15.270/2025", atualizado em 04/03/2026),
// com o INSS que a página usou (tabela de 2025), para conferir só a parte do imposto.
test('IRRF: os exemplos publicados pela Receita Federal saem iguais (José, Maria e Rita)',()=>{
 const jose=irrfMensal({rendimento:4000,inss:373.41});
 assert.equal(jose.modo,'simplificado');perto(jose.base,3392.80);perto(jose.impostoPelaTabela,114.76);perto(jose.reducao,114.76);perto(jose.valor,0);
 const maria=irrfMensal({rendimento:5000,inss:509.60});
 assert.equal(maria.modo,'simplificado');perto(maria.base,4392.80);perto(maria.impostoPelaTabela,312.89);perto(maria.reducao,312.89);perto(maria.valor,0);
 const rita=irrfMensal({rendimento:6000,inss:649.60});
 assert.equal(rita.modo,'legal');perto(rita.base,5350.40);perto(rita.impostoPelaTabela,562.63);perto(rita.reducao,179.75);perto(rita.valor,382.88);
 perto(rita.aliquota,0.275);perto(rita.parcelaADeduzir,908.73);
});

test('IRRF: dependentes só contam nas deduções legais; vence a base menor',()=>{
 const semDependente=irrfMensal({rendimento:6000,inss:641.51});
 assert.equal(semDependente.modo,'legal');perto(semDependente.base,5358.49);
 const umDependente=irrfMensal({rendimento:6000,inss:641.51,dependentes:1});
 perto(umDependente.baseLegal,5168.90);perto(umDependente.baseSimplificada,5392.80);assert.equal(umDependente.modo,'legal');
 perto(umDependente.impostoPelaTabela,512.72);perto(umDependente.reducao,179.75);perto(umDependente.valor,332.97);
 const baixo=irrfMensal({rendimento:3000,inss:248.60,dependentes:3}); // 3 dependentes: as deduções legais passam o simplificado
 assert.equal(baixo.modo,'legal');perto(baixo.base,2182.63);perto(baixo.valor,0);perto(baixo.aliquota,0);
 const semFilhos=irrfMensal({rendimento:3000,inss:248.60});
 assert.equal(semFilhos.modo,'simplificado');perto(semFilhos.base,2392.80);perto(semFilhos.valor,0);
});

test('IRRF: a redução da Lei 15.270/2025 zera até R$ 5 mil, decresce até R$ 7.350 e some acima disso',()=>{
 perto(irrfMensal({rendimento:2000,inss:155.69}).reducao,0); // limitada ao imposto, que é zero
 perto(irrfMensal({rendimento:5000,inss:501.51}).reducao,312.89);
 perto(irrfMensal({rendimento:7200,inss:809.51}).reducao,19.98);
 perto(irrfMensal({rendimento:7350,inss:988.09}).reducao,0);
 perto(irrfMensal({rendimento:7350.01,inss:988.09}).reducao,0);
 perto(irrfMensal({rendimento:10_000,inss:988.09}).reducao,0);
});

test('salário líquido: cinco casos de referência com a tabela de 2026',()=>{
 const casos=[
  // [bruto, dependentes, INSS, IRRF, líquido]
  [1621,0,121.58,0,1499.42], // salário mínimo de 2026
  [3000,0,248.60,0,2751.40],
  [5000,0,501.51,0,4498.49], // imposto pela tabela de R$ 312,89, zerado pela redução
  [6000,1,641.51,332.97,5025.52],
  [10_000,2,988.09,1465.27,7546.64], // INSS no teto, sem redução
 ];
 for(const [bruto,dependentes,inss,irrf,liquido] of casos){
  const r=salarioLiquido({bruto,dependentes});
  perto(r.inss.valor,inss);perto(r.irrf.valor,irrf);perto(r.liquido,liquido);
  perto(r.bruto-r.inss.valor-r.irrf.valor-r.outrosDescontos,r.liquido,1e-9);
 }
 const teto=salarioLiquido({bruto:8475.55});
 perto(teto.irrf.valor,1150.32);perto(teto.liquido,6337.14);
});

test('outros descontos saem do líquido, mas não mudam o imposto',()=>{
 const sem=salarioLiquido({bruto:3000}),com=salarioLiquido({bruto:3000,outrosDescontos:200});
 perto(com.liquido,2551.40);perto(com.irrf.valor,sem.irrf.valor);perto(com.inss.valor,sem.inss.valor);
 perto(com.descontos,448.60);
});

test('para qualquer salário, o líquido cabe no bruto, o INSS cabe no teto e ganhar mais nunca deixa menos na mão',()=>{
 for(const dependentes of [0,1,2]){
  let anterior=0;
  for(let bruto=500;bruto<=15_000;bruto+=7){
   const r=salarioLiquido({bruto,dependentes});
   assert.ok(r.liquido<=bruto&&r.liquido>0,`${bruto}: líquido fora do bruto`);
   assert.ok(r.inss.valor<=988.09+1e-9,`${bruto}: INSS acima do teto`);
   assert.ok(r.irrf.valor>=0&&r.irrf.reducao>=0,`${bruto}: imposto ou redução negativos`);
   assert.ok(r.liquido>=anterior-1e-9,`${bruto} com ${dependentes} dependentes: líquido caiu (${anterior} → ${r.liquido})`);
   anterior=r.liquido;
  }
 }
 // Sem degrau em R$ 5.000: a redução de até R$ 312,89 vira a fórmula decrescente sem salto.
 perto(salarioLiquido({bruto:5000}).liquido,salarioLiquido({bruto:5000.01}).liquido,0.02);
});

test('erros em português para entradas fora da regra',()=>{
 assert.throws(()=>salarioLiquido({bruto:0}),{name:'RangeError',message:/salário bruto maior que zero/});
 assert.throws(()=>salarioLiquido({bruto:-100}),{name:'RangeError',message:/salário bruto maior que zero/});
 assert.throws(()=>salarioLiquido({bruto:3000,dependentes:-1}),{name:'RangeError',message:/dependentes.*número inteiro/i});
 assert.throws(()=>salarioLiquido({bruto:3000,dependentes:1.5}),{name:'RangeError',message:/dependentes.*número inteiro/i});
 assert.throws(()=>salarioLiquido({bruto:3000,outrosDescontos:-1}),{name:'RangeError',message:/descontos não podem ser negativos/});
 assert.throws(()=>salarioLiquido({bruto:3000,outrosDescontos:5000}),{name:'RangeError',message:/descontos passam do salário/});
 assert.throws(()=>inssDoEmpregado(Number.NaN),{name:'RangeError'});
});

// Risco 7 do plano: a página nova existe para o site inteiro (inicial, sitemap, SEO), não só como componente.
test('/salario-liquido está nas ferramentas, nos caminhos públicos e no sitemap com a data de revisão da página',()=>{
 const f=ferramentas.find(x=>x.slug==='salario-liquido');
 assert.ok(f,'ferramenta salario-liquido');
 assert.equal(f.categoria,'Entender os valores');
 assert.ok(caminhosPublicos(config.emailContato).includes('/salario-liquido'));
 const c=conteudos['salario-liquido'];
 assert.match(c.revisadoEm,DATA);
 assert.ok(xmlSitemap(config,revisoesPorCaminho(conteudos)).includes(`<url><loc>${config.origem}/salario-liquido</loc><lastmod>${c.revisadoEm}</lastmod></url>`));
 assert.ok(c.exemplos.length>=2&&c.passos.length>=2&&c.perguntas.length>=3);
 assert.match(c.atencao,/não é previsão nem recomendação/i);
 assert.match(c.atencao,/valores que você digitou/i);
 assert.match(c.atencao,/2026/,'o texto diz de que ano são as tabelas');
});

// Os exemplos da página saem da mesma conta que a tela usa: o texto não pode mostrar um número que a calculadora não dá.
test('os números dos exemplos da página (3 mil; 6 mil com 1 dependente; 10 mil com 2) são os da conta',()=>{
 const semNbsp=s=>s.replace(/ /g,' '); // o Intl separa "R$" do número com espaço duro; o texto da página usa espaço comum
 const texto=semNbsp(conteudos['salario-liquido'].exemplos.map(e=>e.conta+' '+e.leitura).join(' '));
 for(const [bruto,dependentes] of [[3000,0],[6000,1],[10_000,2]]){
  const r=salarioLiquido({bruto,dependentes});
  for(const v of [r.liquido,r.inss.valor,...(r.irrf.valor>0?[r.irrf.valor]:[])]){
   const esperado=semNbsp(v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
   assert.ok(texto.includes(esperado),`exemplo de ${bruto} sem ${esperado}`);
  }
 }
});
