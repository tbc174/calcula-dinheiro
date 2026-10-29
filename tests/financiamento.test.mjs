// Calculadora de financiamento (SAC × Price), Tarefa 6 do plano de receita com AdSense (a 1ª das quatro da D1).
// A conta é portada de src/ferramentas/financiamento.py do TickerLab: os valores esperados aqui saíram do Python
// (teste de igualdade, risco 4 do plano). Também confere o risco 7: a página nova está em caminhosPublicos e no sitemap.
import test from 'node:test';
import assert from 'node:assert/strict';
import {tabela,resumo,compararSistemas,parcelaPrice,PRAZO_MAXIMO} from '../lib/calculos/financiamento.ts';
import {caminhosPublicos,xmlSitemap,revisoesPorCaminho} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import {conteudos} from '../lib/conteudo.ts';
import config from '../config/publicacao.json' with {type:'json'};

const perto=(a,b,rel=1e-9)=>assert.ok(Math.abs(a-b)<=Math.max(Math.abs(b)*rel,1e-6),`${a} ≠ ${b}`);
const soma=(linhas,chave)=>linhas.reduce((s,l)=>s+l[chave],0);
const VALOR=300_000,TAXA=0.01,MESES=360;

test('Price: parcela fixa igual à do Python, juros totais e saldo zerado no fim',()=>{
 const linhas=tabela({sistema:'price',valor:VALOR,taxa:TAXA,meses:MESES});
 assert.equal(linhas.length,MESES);
 perto(linhas[0].parcela,3085.837790776513);
 perto(linhas.at(-1).parcela,3085.837790776513);
 perto(soma(linhas,'juros'),810901.6046795504);
 perto(linhas.at(-1).saldo,0);
 perto(parcelaPrice(VALOR,TAXA,MESES),3085.837790776513);
});

test('SAC: amortização fixa, parcela que cai e juros totais iguais aos do Python',()=>{
 const linhas=tabela({sistema:'sac',valor:VALOR,taxa:TAXA,meses:MESES});
 perto(linhas[0].amortizacao,VALOR/MESES);
 perto(linhas[0].parcela,3833.3333333333335);
 perto(linhas.at(-1).parcela,841.6666666663211);
 perto(soma(linhas,'juros'),541499.9999999998);
});

test('juro zero divide o valor pelas parcelas nos dois sistemas',()=>{
 for(const sistema of ['sac','price'])for(const l of tabela({sistema,valor:1200,taxa:0,meses:12}))perto(l.parcela,100);
});

test('amortização extra reduzindo o prazo termina antes e mantém a parcela (Price)',()=>{
 const sem=tabela({sistema:'price',valor:VALOR,taxa:TAXA,meses:MESES});
 const com=tabela({sistema:'price',valor:VALOR,taxa:TAXA,meses:MESES,extraMes:12,extraValor:50_000,extraModo:'prazo'});
 assert.equal(com.length,178);
 perto(com[11].extra,50_000);
 perto(com[12].parcela,sem[12].parcela);
 perto(soma(com,'juros'),296604.07783522573);
});

test('amortização extra reduzindo a parcela mantém o prazo (SAC)',()=>{
 const sem=tabela({sistema:'sac',valor:VALOR,taxa:TAXA,meses:MESES});
 const com=tabela({sistema:'sac',valor:VALOR,taxa:TAXA,meses:MESES,extraMes:12,extraValor:50_000,extraModo:'parcela'});
 assert.equal(com.length,MESES);
 perto(com[12].parcela,3089.655172413796);
 assert.ok(com[12].parcela<sem[12].parcela);
});

test('extra maior que o saldo quita tudo; Price com taxa alta zera o saldo no último mês',()=>{
 const quitado=tabela({sistema:'price',valor:10_000,taxa:TAXA,meses:24,extraMes:3,extraValor:1_000_000});
 assert.equal(quitado.length,3);
 assert.equal(quitado.at(-1).saldo,0);
 perto(quitado.at(-1).extra,8876.636718162858);
 const alta=tabela({sistema:'price',valor:300_000,taxa:0.10,meses:600});
 assert.equal(alta.length,600);
 assert.equal(alta.at(-1).saldo,0);
 perto(soma(alta,'amortizacao'),300_000);
});

test('as amortizações mais as extras pagam exatamente o valor, em qualquer combinação',()=>{
 let semente=7;const sorteio=()=>{semente=(semente*48271)%2147483647;return semente/2147483647};
 for(let i=0;i<60;i++){
  const sistema=sorteio()<.5?'sac':'price',valor=1_000+sorteio()*2_000_000,taxa=sorteio()*0.03,meses=1+Math.floor(sorteio()*420);
  const extraMes=Math.min(Math.floor(sorteio()*421),meses),extraValor=sorteio()*500_000,extraModo=sorteio()<.5?'prazo':'parcela';
  const linhas=tabela({sistema,valor,taxa,meses,extraMes,extraValor,extraModo});
  perto(soma(linhas,'amortizacao')+soma(linhas,'extra'),valor);
  assert.ok(linhas.length<=meses);
 }
});

test('entradas inválidas explicam o erro em português',()=>{
 assert.throws(()=>tabela({sistema:'bala',valor:1000,taxa:.01,meses:12}),/sistema/);
 assert.throws(()=>tabela({sistema:'sac',valor:0,taxa:.01,meses:12}),/valor/);
 assert.throws(()=>tabela({sistema:'sac',valor:1000,taxa:-.01,meses:12}),/taxa/);
 assert.throws(()=>tabela({sistema:'sac',valor:1000,taxa:1,meses:12}),/taxa/);
 assert.throws(()=>tabela({sistema:'sac',valor:1000,taxa:.01,meses:0}),/prazo/);
 assert.throws(()=>tabela({sistema:'sac',valor:1000,taxa:.01,meses:PRAZO_MAXIMO+1}),/prazo/);
 assert.throws(()=>tabela({sistema:'sac',valor:1000,taxa:.01,meses:12,extraModo:'tudo'}),/extra/);
});

test('resumo e comparação: primeira e última parcela, juros e total pago de cada sistema',()=>{
 const r=compararSistemas({valor:VALOR,taxa:TAXA,meses:MESES});
 perto(r.price.primeiraParcela,3085.837790776513);perto(r.price.ultimaParcela,3085.837790776513);
 perto(r.price.totalJuros,810901.6046795504);perto(r.price.totalPago,1110901.6046795505);
 perto(r.sac.primeiraParcela,3833.3333333333335);perto(r.sac.ultimaParcela,841.6666666663211);
 perto(r.sac.totalJuros,541499.9999999998);perto(r.sac.totalPago,841499.9999999994);
 assert.equal(r.sac.meses,MESES);assert.equal(r.price.meses,MESES);
 perto(r.price.totalJuros-r.sac.totalJuros,269401.6046795506);
 const curto=resumo({sistema:'price',valor:VALOR,taxa:TAXA,meses:MESES,extraMes:12,extraValor:50_000});
 assert.equal(curto.meses,178);assert.equal(curto.linhas.length,178);
 perto(curto.totalPago,soma(curto.linhas,'parcela')+50_000,1e-9);
});

test('a página de financiamento está em caminhosPublicos e no sitemap com a sua revisão (risco 7)',()=>{
 const f=ferramentas.find(f=>f.slug==='financiamento');
 assert.ok(f,'financiamento em lib/ferramentas.ts');
 assert.ok(caminhosPublicos(config.emailContato).includes('/financiamento'));
 const c=conteudos.financiamento;
 assert.match(c.revisadoEm,/^\d{4}-\d{2}-\d{2}$/);
 const xml=xmlSitemap(config,revisoesPorCaminho(conteudos));
 assert.ok(xml.includes(`<loc>${config.origem}/financiamento</loc><lastmod>${c.revisadoEm}</lastmod>`));
 assert.ok(c.exemplos.length>=2&&c.passos.length>=2,'explicação com passos e exemplos');
 assert.match(c.atencao,/não é previsão nem recomendação/i,'frase de honestidade no texto da página (risco 5)');
});
