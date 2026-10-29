// Calculadora de rescisão (saldo de salário, aviso prévio, 13º e férias proporcionais, multa do FGTS, por tipo de
// desligamento), Tarefa 20 do plano de receita com AdSense (a 2ª das quatro confirmadas pelo Tiago em 29/10/2026). Não há
// Python do TickerLab para portar: os valores esperados saíram de uma implementação independente em Python com aritmética
// decimal (scratchpad da sessão de 29/10/2026); as tabelas de INSS e IRRF de 2026 são as de lib/calculos/salario-liquido.ts.
// Risco 4 do plano: as tabelas carregam `vigenteAte` e este arquivo FALHA quando a data passa. Risco 7: a página existe
// para o site inteiro (inicial, sitemap, SEO), não só como componente.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DIAS_DE_AVISO_BASE,DIAS_DE_AVISO_POR_ANO,TETO_DO_AVISO,ALIQUOTA_DA_MULTA,ALIQUOTA_DA_MULTA_NO_ACORDO,ALIQUOTA_DO_FGTS,DIAS_DO_MES_COMERCIAL,
 TIPOS,AVISOS_POR_TIPO,anosCompletos,diasDeAvisoPrevio,somarDias,avosPorMesesDoCalendario,avosPorAniversario,rescisao,
} from '../lib/calculos/rescisao.ts';
import {INSS_2026,IRRF_2026,arredondar} from '../lib/calculos/salario-liquido.ts';
import {caminhosPublicos,xmlSitemap,revisoesPorCaminho} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import {conteudos} from '../lib/conteudo.ts';
import config from '../config/publicacao.json' with {type:'json'};

const perto=(a,b,tol=0.005)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);
const DATA=/^\d{4}-\d{2}-\d{2}$/;
const A={bruto:3000,admissao:'2024-03-10',desligamento:'2026-10-29',tipo:'sem-justa-causa',aviso:'indenizado'};

test('as tabelas são as de 2026 do salário líquido e ainda estão vigentes (se falhar: atualize as tabelas, não o teste)',()=>{
 const hoje=new Date().toISOString().slice(0,10);
 for(const t of [INSS_2026,IRRF_2026])assert.ok(hoje<=t.vigenteAte,`tabela ${t.nome} venceu em ${t.vigenteAte}; hoje é ${hoje}`);
 assert.equal(DIAS_DE_AVISO_BASE,30);assert.equal(DIAS_DE_AVISO_POR_ANO,3);assert.equal(TETO_DO_AVISO,90);
 assert.equal(ALIQUOTA_DA_MULTA,0.4);assert.equal(ALIQUOTA_DA_MULTA_NO_ACORDO,0.2);assert.equal(ALIQUOTA_DO_FGTS,0.08);assert.equal(DIAS_DO_MES_COMERCIAL,30);
 assert.deepEqual(TIPOS.map(t=>t.valor),['sem-justa-causa','pedido-de-demissao','acordo','justa-causa']);
 assert.deepEqual(AVISOS_POR_TIPO['sem-justa-causa'].map(a=>a.valor),['indenizado','trabalhado']);
 assert.deepEqual(AVISOS_POR_TIPO['acordo'].map(a=>a.valor),['indenizado','trabalhado']);
 assert.deepEqual(AVISOS_POR_TIPO['pedido-de-demissao'].map(a=>a.valor),['trabalhado','dispensado','nao-cumprido']);
 assert.deepEqual(AVISOS_POR_TIPO['justa-causa'].map(a=>a.valor),['nenhum']);
});

test('aviso prévio da Lei 12.506/2011: 30 dias mais 3 por ano completo na empresa, até 90',()=>{
 assert.equal(anosCompletos('2024-03-10','2026-03-09'),1);
 assert.equal(anosCompletos('2024-03-10','2026-03-10'),2,'o aniversário completa o ano');
 assert.equal(anosCompletos('2026-10-05','2026-10-29'),0);
 assert.equal(anosCompletos('2003-05-02','2026-10-29'),23);
 assert.equal(anosCompletos('2024-02-29','2025-02-28'),0,'admitido em 29/02: o ano completa em 01/03');
 assert.equal(anosCompletos('2024-02-29','2025-03-01'),1);
 for(const [anos,dias] of [[0,30],[1,33],[2,36],[10,60],[19,87],[20,90],[23,90]])assert.equal(diasDeAvisoPrevio(anos),dias,`${anos} anos`);
 assert.equal(somarDias('2026-10-29',36),'2026-12-04');
 assert.equal(somarDias('2026-12-28',36),'2027-02-02','a projeção vira o ano');
 assert.equal(somarDias('2026-10-29',0),'2026-10-29');
});

test('avos pela regra dos 15 dias: meses do calendário (13º) e períodos data a data (férias)',()=>{
 assert.equal(avosPorMesesDoCalendario('2026-01-01','2026-12-04').filter(m=>m.conta).length,11,'dezembro com 4 dias não conta');
 assert.equal(avosPorMesesDoCalendario('2026-01-01','2026-12-15').filter(m=>m.conta).length,12,'dezembro com 15 dias conta');
 assert.equal(avosPorMesesDoCalendario('2026-10-05','2026-11-28').filter(m=>m.conta).length,2);
 assert.equal(avosPorMesesDoCalendario('2026-10-20','2026-10-25').filter(m=>m.conta).length,0,'6 dias no único mês');
 assert.equal(avosPorMesesDoCalendario('2026-01-01','2027-01-27').filter(m=>m.conta).length,13,'a projeção do aviso entra em janeiro do ano seguinte');
 const meses=avosPorMesesDoCalendario('2026-10-05','2026-11-28');
 assert.deepEqual(meses,[{ano:2026,mes:10,dias:27,conta:true},{ano:2026,mes:11,dias:28,conta:true}]);
 assert.equal(avosPorAniversario('2026-03-10','2026-12-04'),9,'de 10/11 a 04/12 são 25 dias: conta');
 assert.equal(avosPorAniversario('2026-03-10','2026-11-23'),8,'de 10/11 a 23/11 são 14 dias: não conta');
 assert.equal(avosPorAniversario('2026-03-10','2026-11-24'),9,'15 dias: conta');
 assert.equal(avosPorAniversario('2026-01-15','2026-12-16'),11,'de 15/12 a 16/12 são 2 dias');
 assert.equal(avosPorAniversario('2025-11-01','2026-11-28'),13,'o período fecha (12) e o seguinte já tem 28 dias');
 assert.equal(avosPorAniversario('2026-10-05','2026-10-04'),0);
 assert.equal(avosPorAniversario('2026-01-31','2026-03-30'),2,'admissão no dia 31: o período de fevereiro vai até 27/02 (28 dias) e o de março até 30/03');
});

test('sem justa causa, aviso indenizado: R$ 3.000, de 10/03/2024 a 29/10/2026 (36 dias de aviso, projeção até 04/12)',()=>{
 const r=rescisao(A);
 assert.equal(r.anosCompletos,2);assert.equal(r.avisoPrevio.dias,36);assert.equal(r.dataFinal,'2026-12-04');
 assert.equal(r.saldo.dias,29);perto(r.saldo.valor,2900);perto(r.saldo.inss.valor,236.69);perto(r.saldo.irrf.valor,0);
 perto(r.avisoPrevio.valorCheio,3600);perto(r.avisoPrevio.valor,3600);perto(r.avisoPrevio.desconto,0);
 assert.equal(r.decimo.avos,11);perto(r.decimo.valor,2750);perto(r.decimo.inss.valor,223.19);perto(r.decimo.irrf.valor,0);
 assert.equal(r.ferias.inicioDoPeriodo,'2026-03-10');assert.equal(r.ferias.avos,9);perto(r.ferias.proporcionais,2250);perto(r.ferias.tercoProporcionais,750);
 perto(r.ferias.vencidas,0);perto(r.ferias.tercoVencidas,0);assert.equal(r.ferias.periodosVencidos,0);
 perto(r.verbas,12250);perto(r.descontos,459.88);perto(r.liquido,11790.12);
 assert.equal(r.fgts.saldoInformado,false);assert.equal(r.fgts.mesesDoContrato,31);perto(r.fgts.saldo,7440);perto(r.fgts.depositosDaRescisao,740);
 perto(r.fgts.base,8180);assert.equal(r.fgts.aliquota,0.4);perto(r.fgts.multa,3272);perto(r.total,15062.12);
 perto(r.linhas.filter(l=>l.tipo==='verba').reduce((s,l)=>s+l.valor,0),r.verbas,1e-6);
 perto(r.linhas.filter(l=>l.tipo==='desconto').reduce((s,l)=>s+l.valor,0),r.descontos,1e-6);
 // Aviso trabalhado: os 30 dias são salário do mês; só os 6 dias a mais (2 anos de casa) são indenizados e projetam o contrato até 04/11.
 const t=rescisao({...A,aviso:'trabalhado'});
 assert.equal(t.avisoPrevio.dias,6);perto(t.avisoPrevio.valor,600);assert.equal(t.dataFinal,'2026-11-04');
 assert.equal(t.decimo.avos,10,'novembro com 4 dias não conta');perto(t.decimo.valor,2500);perto(t.decimo.inss.valor,200.69);
 assert.equal(t.ferias.avos,8,'de 10/10 a 04/11 são 26 dias: o 8º período conta; o 9º só viria com a projeção cheia');perto(t.ferias.proporcionais,2000);perto(t.ferias.tercoProporcionais,666.67);
 perto(t.verbas,8666.67);perto(t.descontos,437.38);perto(t.liquido,8229.29);perto(t.fgts.depositosDaRescisao,480);perto(t.fgts.multa,3168);perto(t.total,11397.29);
 const novato=rescisao({...A,admissao:'2026-02-01',aviso:'trabalhado'});
 assert.equal(novato.avisoPrevio.dias,0,'com menos de um ano não há dia a mais');perto(novato.avisoPrevio.valor,0);assert.equal(novato.dataFinal,'2026-10-29');
});

test('pedido de demissão: R$ 2.500, de 01/08/2025 a 15/10/2026, sem multa do FGTS; aviso não cumprido desconta um salário',()=>{
 const b={bruto:2500,admissao:'2025-08-01',desligamento:'2026-10-15',tipo:'pedido-de-demissao',aviso:'trabalhado'};
 const r=rescisao(b);
 assert.equal(r.saldo.dias,15);perto(r.saldo.valor,1250);perto(r.saldo.inss.valor,93.75);
 assert.equal(r.decimo.avos,10);perto(r.decimo.valor,2083.33);perto(r.decimo.inss.valor,163.18);
 assert.equal(r.ferias.inicioDoPeriodo,'2026-08-01');assert.equal(r.ferias.avos,3);perto(r.ferias.proporcionais,625);perto(r.ferias.tercoProporcionais,208.33);
 perto(r.verbas,4166.66);perto(r.descontos,256.93);perto(r.liquido,3909.73);
 assert.equal(r.fgts.aliquota,0);perto(r.fgts.multa,0);perto(r.total,r.liquido,1e-9);
 const d=rescisao({...b,aviso:'nao-cumprido'});
 perto(d.avisoPrevio.desconto,2500);perto(d.descontos,2756.93);perto(d.liquido,1409.73);
 const dispensado=rescisao({...b,aviso:'dispensado'});
 perto(dispensado.liquido,r.liquido,1e-9);
 // O desconto do aviso não cumprido não passa do que há para receber: o acerto não fica negativo.
 const curto=rescisao({bruto:3000,admissao:'2026-10-20',desligamento:'2026-10-25',tipo:'pedido-de-demissao',aviso:'nao-cumprido'});
 perto(curto.saldo.valor,600);perto(curto.saldo.inss.valor,45);assert.equal(curto.decimo.avos,0);assert.equal(curto.ferias.avos,0);
 perto(curto.avisoPrevio.desconto,555);perto(curto.liquido,0);
});

test('acordo (art. 484-A da CLT): R$ 5.000 com 1 dependente, de 15/01/2020 a 29/10/2026, 1 período de férias vencido, FGTS de R$ 30 mil',()=>{
 const r=rescisao({bruto:5000,admissao:'2020-01-15',desligamento:'2026-10-29',tipo:'acordo',aviso:'indenizado',feriasVencidas:1,dependentes:1,saldoDoFgts:30_000});
 assert.equal(r.anosCompletos,6);assert.equal(r.avisoPrevio.dias,48);perto(r.avisoPrevio.valorCheio,8000);perto(r.avisoPrevio.valor,4000); // metade do aviso indenizado
 assert.equal(r.dataFinal,'2026-12-16');
 perto(r.saldo.valor,4833.33);perto(r.saldo.inss.valor,478.18);perto(r.saldo.irrf.valor,0); // o imposto da tabela (R$ 261,76) é zerado pela redução da Lei 15.270
 perto(r.saldo.irrf.impostoPelaTabela,261.76);
 assert.equal(r.decimo.avos,12);perto(r.decimo.valor,5000);perto(r.decimo.inss.valor,501.51);perto(r.decimo.irrf.valor,0);
 assert.equal(r.ferias.avos,11);perto(r.ferias.proporcionais,4583.33);perto(r.ferias.tercoProporcionais,1527.78);
 assert.equal(r.ferias.periodosVencidos,1);perto(r.ferias.vencidas,5000);perto(r.ferias.tercoVencidas,1666.67);
 perto(r.verbas,26_611.11);perto(r.descontos,979.69);perto(r.liquido,25_631.42);
 assert.equal(r.fgts.saldoInformado,true);perto(r.fgts.saldo,30_000);perto(r.fgts.depositosDaRescisao,1106.67);perto(r.fgts.base,31_106.67);
 assert.equal(r.fgts.aliquota,0.2);perto(r.fgts.multa,6221.33);perto(r.total,31_852.75);
});

test('justa causa: só o saldo de salário e as férias vencidas com o terço; sem aviso, 13º, férias proporcionais ou multa',()=>{
 const r=rescisao({...A,tipo:'justa-causa',aviso:'nenhum',feriasVencidas:1});
 perto(r.saldo.valor,2900);perto(r.saldo.inss.valor,236.69);
 assert.equal(r.avisoPrevio.dias,0);perto(r.avisoPrevio.valor,0);assert.equal(r.dataFinal,'2026-10-29');
 assert.equal(r.decimo.avos,0);perto(r.decimo.valor,0);assert.equal(r.decimo.inss,null);assert.equal(r.decimo.irrf,null);
 assert.equal(r.ferias.avos,0);perto(r.ferias.proporcionais,0);perto(r.ferias.vencidas,3000);perto(r.ferias.tercoVencidas,1000);
 perto(r.verbas,6900);perto(r.descontos,236.69);perto(r.liquido,6663.31);perto(r.fgts.multa,0);perto(r.total,6663.31);
});

test('teto de 90 dias de aviso, 13 avos de 13º pela projeção e imposto de renda nos dois descontos: R$ 8.000 desde 02/05/2003, 2 dependentes',()=>{
 const r=rescisao({bruto:8000,admissao:'2003-05-02',desligamento:'2026-10-29',tipo:'sem-justa-causa',aviso:'indenizado',dependentes:2});
 assert.equal(r.anosCompletos,23);assert.equal(r.avisoPrevio.dias,90);perto(r.avisoPrevio.valor,24_000);assert.equal(r.dataFinal,'2027-01-27');
 perto(r.saldo.valor,7733.33);perto(r.saldo.inss.valor,884.18);perto(r.saldo.irrf.valor,870.51);assert.equal(r.saldo.irrf.modo,'legal');
 assert.equal(r.decimo.avos,13);perto(r.decimo.valor,8666.67);perto(r.decimo.inss.valor,988.09);assert.equal(r.decimo.inss.noTeto,true);perto(r.decimo.irrf.valor,1098.61);
 assert.equal(r.ferias.inicioDoPeriodo,'2026-05-02');assert.equal(r.ferias.avos,9);perto(r.ferias.proporcionais,6000);perto(r.ferias.tercoProporcionais,2000);
 perto(r.verbas,48_400);perto(r.descontos,3841.39);perto(r.liquido,44_558.61);
 assert.equal(r.fgts.mesesDoContrato,281);perto(r.fgts.saldo,179_840);perto(r.fgts.depositosDaRescisao,3232);perto(r.fgts.multa,73_228.80);perto(r.total,117_787.41);
});

test('bordas das datas: admissão e desligamento no mesmo mês; projeção que fecha um período de férias; projeção que vira o ano',()=>{
 const f=rescisao({bruto:3000,admissao:'2026-10-05',desligamento:'2026-10-29',tipo:'sem-justa-causa',aviso:'indenizado'});
 assert.equal(f.anosCompletos,0);assert.equal(f.avisoPrevio.dias,30);assert.equal(f.saldo.dias,25);perto(f.saldo.valor,2500);
 assert.equal(f.decimo.avos,2);perto(f.decimo.valor,500);perto(f.decimo.inss.valor,37.50);
 assert.equal(f.ferias.avos,2);perto(f.ferias.proporcionais,500);perto(f.ferias.tercoProporcionais,166.67);
 assert.equal(f.fgts.mesesDoContrato,0);perto(f.fgts.saldo,0);perto(f.fgts.depositosDaRescisao,480);perto(f.fgts.multa,192);perto(f.total,6620.48);
 const g=rescisao({bruto:4000,admissao:'2025-11-01',desligamento:'2026-10-29',tipo:'sem-justa-causa',aviso:'indenizado'});
 assert.equal(g.ferias.inicioDoPeriodo,'2025-11-01');assert.equal(g.ferias.avos,13);perto(g.ferias.proporcionais,4333.33);perto(g.ferias.tercoProporcionais,1444.44);
 assert.equal(g.decimo.avos,11);perto(g.liquido,16_629.91);perto(g.fgts.multa,1777.07);
 const h=rescisao({...A,desligamento:'2026-12-28'});
 assert.equal(h.dataFinal,'2027-02-02');assert.equal(h.saldo.dias,28);perto(h.saldo.valor,2800);
 assert.equal(h.decimo.avos,13);perto(h.decimo.valor,3250);perto(h.decimo.inss.valor,278.60);
 assert.equal(h.ferias.avos,11);perto(h.ferias.proporcionais,2750);perto(h.liquido,12_810.38);perto(h.fgts.multa,3476.80);perto(h.total,16_287.18);
 const dia31=rescisao({...A,desligamento:'2026-10-31'});
 assert.equal(dia31.saldo.dias,30,'dia 31 vale o mês comercial inteiro');perto(dia31.saldo.valor,3000);
});

test('para qualquer salário, data e tipo: as linhas somam os totais, nada é negativo e o tipo mais protegido nunca recebe menos',()=>{
 for(const [admissao,desligamento] of [['2024-03-10','2026-10-29'],['2026-02-01','2026-10-15'],['2010-07-31','2026-12-28'],['2026-10-20','2026-10-25']]){
  for(const dependentes of [0,2]){
   for(let bruto=500;bruto<=15_000;bruto+=97){
    const por=(tipo,aviso)=>rescisao({bruto,admissao,desligamento,tipo,aviso,dependentes,feriasVencidas:1});
    const semJustaCausa=por('sem-justa-causa','indenizado'),acordo=por('acordo','indenizado'),pedido=por('pedido-de-demissao','trabalhado'),justaCausa=por('justa-causa','nenhum');
    for(const r of [semJustaCausa,acordo,pedido,justaCausa,por('sem-justa-causa','trabalhado'),por('pedido-de-demissao','nao-cumprido')]){
     perto(r.linhas.filter(l=>l.tipo==='verba').reduce((s,l)=>s+l.valor,0),r.verbas,1e-6);
     perto(r.linhas.filter(l=>l.tipo==='desconto').reduce((s,l)=>s+l.valor,0),r.descontos,1e-6);
     perto(r.verbas-r.descontos,r.liquido,1e-6);perto(r.liquido+r.fgts.multa,r.total,1e-6);
     for(const [nome,v] of Object.entries({liquido:r.liquido,saldo:r.saldo.valor,aviso:r.avisoPrevio.valor,decimo:r.decimo.valor,ferias:r.ferias.proporcionais,multa:r.fgts.multa,desconto:r.avisoPrevio.desconto}))assert.ok(v>=-1e-9,`${bruto} ${admissao}: ${nome} negativo (${v})`);
     perto(r.ferias.tercoProporcionais,arredondar(r.ferias.proporcionais/3),0.011);
     assert.ok(r.avisoPrevio.dias<=TETO_DO_AVISO&&r.saldo.dias<=DIAS_DO_MES_COMERCIAL);
    }
    assert.ok(semJustaCausa.total>=acordo.total-1e-9&&acordo.total>=pedido.total-1e-9&&pedido.total>=justaCausa.total-1e-9,`${bruto} ${admissao}: ordem dos tipos`);
    assert.equal(pedido.fgts.multa,0);assert.equal(justaCausa.fgts.multa,0);
    perto(acordo.avisoPrevio.valor,arredondar(semJustaCausa.avisoPrevio.valorCheio/2),0.011);
   }
  }
 }
});

test('erros em português para entradas fora da regra',()=>{
 assert.throws(()=>rescisao({...A,bruto:0}),{name:'RangeError',message:/salário bruto maior que zero/});
 assert.throws(()=>rescisao({...A,admissao:'ontem'}),{name:'RangeError',message:/data de admissão/});
 assert.throws(()=>rescisao({...A,desligamento:'2026-13-01'}),{name:'RangeError',message:/data do desligamento/});
 assert.throws(()=>rescisao({...A,desligamento:'2024-03-09'}),{name:'RangeError',message:/desligamento.*antes da admissão/});
 assert.throws(()=>rescisao({...A,tipo:'outro'}),{name:'RangeError',message:/tipo de desligamento/});
 assert.throws(()=>rescisao({...A,aviso:'nao-cumprido'}),{name:'RangeError',message:/aviso prévio.*não vale para/});
 assert.throws(()=>rescisao({...A,tipo:'justa-causa',aviso:'indenizado'}),{name:'RangeError',message:/aviso prévio.*não vale para/});
 assert.throws(()=>rescisao({...A,dependentes:1.5}),{name:'RangeError',message:/dependentes.*número inteiro/i});
 assert.throws(()=>rescisao({...A,feriasVencidas:-1}),{name:'RangeError',message:/férias vencidas.*inteiro/i});
 assert.throws(()=>rescisao({...A,feriasVencidas:1.5}),{name:'RangeError',message:/férias vencidas.*inteiro/i});
 assert.throws(()=>rescisao({...A,saldoDoFgts:-10}),{name:'RangeError',message:/saldo do FGTS não pode ser negativo/});
});

// Risco 7 do plano: a página nova existe para o site inteiro (inicial, sitemap, SEO), não só como componente.
test('/rescisao está nas ferramentas, nos caminhos públicos e no sitemap com a data de revisão da página',()=>{
 const f=ferramentas.find(x=>x.slug==='rescisao');
 assert.ok(f,'ferramenta rescisao');
 assert.equal(f.categoria,'Entender os valores');
 assert.ok(caminhosPublicos(config.emailContato).includes('/rescisao'));
 const c=conteudos['rescisao'];
 assert.match(c.revisadoEm,DATA);
 assert.ok(xmlSitemap(config,revisoesPorCaminho(conteudos)).includes(`<url><loc>${config.origem}/rescisao</loc><lastmod>${c.revisadoEm}</lastmod></url>`));
 assert.ok(c.exemplos.length>=2&&c.passos.length>=2&&c.perguntas.length>=3);
 assert.match(c.atencao,/não é previsão nem recomendação/i);
 assert.match(c.atencao,/valores que você digitou/i);
 assert.match(c.atencao,/2026/,'o texto diz de que ano são as tabelas');
 const texto=c.introducao+' '+c.perguntas.map(p=>p.resposta).join(' ');
 assert.match(texto,/40%/,'o texto diz a multa de 40%');
 assert.match(texto,/20%/,'o texto diz a multa de 20% do acordo');
 assert.match(texto,/3 dias/,'o texto explica os 3 dias por ano do aviso');
 assert.match(texto,/justa causa/i);
});

// Os exemplos da página saem da mesma conta que a tela usa: o texto não pode mostrar um número que a calculadora não dá.
test('os números dos exemplos da página (sem justa causa 3 mil; pedido de demissão 2,5 mil; acordo 5 mil) são os da conta',()=>{
 const semNbsp=s=>s.replace(/ /g,' '); // o Intl separa "R$" do número com espaço duro; o texto da página usa espaço comum
 const texto=semNbsp(conteudos['rescisao'].exemplos.map(e=>e.conta+' '+e.leitura).join(' '));
 const entradas=[A,{bruto:2500,admissao:'2025-08-01',desligamento:'2026-10-15',tipo:'pedido-de-demissao',aviso:'trabalhado'},{bruto:5000,admissao:'2020-01-15',desligamento:'2026-10-29',tipo:'acordo',aviso:'indenizado',feriasVencidas:1,dependentes:1,saldoDoFgts:30_000}];
 for(const e of entradas){
  const r=rescisao(e);
  const valores=[r.saldo.valor,r.decimo.valor,r.ferias.proporcionais,r.liquido,r.saldo.inss.valor,r.decimo.inss.valor,...(r.avisoPrevio.valor>0?[r.avisoPrevio.valor]:[]),...(r.fgts.multa>0?[r.fgts.multa,r.total]:[])];
  for(const v of valores){
   const esperado=semNbsp(v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
   assert.ok(texto.includes(esperado),`exemplo de ${e.bruto} (${e.tipo}) sem ${esperado}`);
  }
 }
});
