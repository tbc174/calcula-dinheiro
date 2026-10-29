// Calculadora do rotativo do cartão (Tarefa 22 do plano de receita com AdSense, a última das quatro confirmadas em 29/10):
// um mês de rotativo, o parcelamento da fatura com o teto de 100% da Lei 14.690/2023 e a comparação com um empréstimo
// pessoal. Não há Python para portar: os valores esperados saíram de uma implementação independente em Decimal (scratchpad
// da sessão de 29/10/2026) e das fontes citadas em lib/calculos/rotativo.ts. A tabela de taxas de referência carrega
// `vigenteAte` e este arquivo FALHA quando a data passa (como o IOF do empréstimo).
import test from 'node:test';
import assert from 'node:assert/strict';
import {TAXAS_DE_REFERENCIA,TETO_DOS_JUROS,DIAS_DO_ROTATIVO,PARCELAS_MAXIMAS,taxaMensalDaAnual,mesesParaDobrar,simularRotativo} from '../lib/calculos/rotativo.ts';
import {simularEmprestimo} from '../lib/calculos/emprestimo.ts';
import {estadoDaTabela} from '../lib/calculos/salario-liquido.ts';
import {caminhosPublicos,xmlSitemap,revisoesPorCaminho} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import {conteudos} from '../lib/conteudo.ts';
import config from '../config/publicacao.json' with {type:'json'};

// Os valores de referência foram arredondados a 6 casas: o piso absoluto cobre esse arredondamento.
const perto=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=Math.max(Math.abs(b)*tol,2e-6),`${a} ≠ ${b}`);
const DATA=/^\d{4}-\d{2}-\d{2}$/;
const PADRAO={fatura:1000,pagamento:150,taxaDoRotativo:0.15,taxaDoParcelamento:0.095,parcelas:12,taxaDoEmprestimo:0.06};

test('as constantes legais: teto de 100%, rotativo de 30 dias (até a fatura seguinte) e até 60 parcelas',()=>{
 assert.equal(TETO_DOS_JUROS,1);
 assert.equal(DIAS_DO_ROTATIVO,30);
 assert.equal(PARCELAS_MAXIMAS,60);
});

test('a tabela de taxas de referência diz as taxas ao ano do BCB, de quando até quando vale e de onde veio',()=>{
 const t=TAXAS_DE_REFERENCIA;
 assert.ok(t.rotativoAoAno>t.parcelamentoAoAno&&t.parcelamentoAoAno>t.emprestimoAoAno,'rotativo > parcelamento > crédito pessoal, como no BCB');
 assert.match(t.vigenteDesde,DATA);assert.match(t.vigenteAte,DATA);
 assert.ok(t.vigenteDesde<t.vigenteAte);
 assert.match(t.fonte,/Banco Central|BCB/);
 perto(taxaMensalDaAnual(t.rotativoAoAno),0.152,0.01);
 perto(taxaMensalDaAnual(t.parcelamentoAoAno),0.093,0.01);
 perto(taxaMensalDaAnual(t.emprestimoAoAno),0.064,0.01);
 perto(taxaMensalDaAnual(0),0);
});

// Quando este teste falhar, as taxas de referência envelheceram: busque as taxas médias do mês mais recente nas
// Estatísticas monetárias e de crédito do BCB, atualize a tabela e o vigenteAte; só então ajuste a data aqui.
test('as taxas de referência ainda valem hoje (se falhar: atualize a tabela com o BCB, não o teste)',()=>{
 const hoje=new Date().toISOString().slice(0,10);
 assert.notEqual(estadoDaTabela(new Date(),TAXAS_DE_REFERENCIA),'fora-da-vigencia',`as taxas venceram em ${TAXAS_DE_REFERENCIA.vigenteAte} (hoje é ${hoje})`);
});

test('em quantos meses de rotativo os juros chegam ao teto: a dívida dobra em 5 meses a 15%, em 8 a 10%, nunca a 0%',()=>{
 assert.equal(mesesParaDobrar(0.15),5);
 assert.equal(mesesParaDobrar(0.10),8);
 assert.equal(mesesParaDobrar(0.5),2);
 assert.equal(mesesParaDobrar(0),null);
});

const CASOS=[
 {"nome":"1000 paga 150, 15%/9,5%, 12x, emp 6%","entrada":{"fatura":1000.0,"pagamento":150.0,"taxaDoRotativo":0.15,"taxaDoParcelamento":0.095,"parcelas":12,"taxaDoEmprestimo":0.06},"valorOriginal":850.0,"teto":850.0,"dividaMaxima":1700.0,"mesesParaDobrar":5,"rotativo":{"juros":127.5,"iof":5.321,"proximaFatura":982.821},"parcelamento":{"saldoParcelado":1005.339562,"iof":22.518562,"parcela":143.952274,"parcelas":12,"jurosSemTeto":722.087725,"juros":722.087725,"mesDoTeto":null,"totalPago":1727.427287,"jurosEEncargos":849.587725,"jurosEEncargosSemTeto":849.587725,"custoTotal":877.427287,"primeiraLinha":{"mes":1,"parcela":143.952274,"juros":95.507258,"amortizacao":48.445016,"saldo":956.894546,"jurosAcumulados":223.007258},"ultimaLinha":{"mes":12,"parcela":143.952274,"juros":12.48901,"amortizacao":131.463264,"saldo":0.0,"jurosAcumulados":849.587725}},"emprestimo":{"valorFinanciado":868.662607,"iof":18.662607,"parcela":103.611495,"totalPago":1243.337943,"totalJuros":374.675336,"custoTotal":393.337943}},
 {"nome":"2500 paga 0, 15,2%/9,3%, 24x, emp 5%","entrada":{"fatura":2500.0,"pagamento":0.0,"taxaDoRotativo":0.152,"taxaDoParcelamento":0.093,"parcelas":24,"taxaDoEmprestimo":0.05},"valorOriginal":2500.0,"teto":2500.0,"dividaMaxima":5000.0,"mesesParaDobrar":5,"rotativo":{"juros":380.0,"iof":15.65,"proximaFatura":2895.65},"parcelamento":{"saldoParcelado":2987.722173,"iof":92.072173,"parcela":315.151913,"parcelas":24,"jurosSemTeto":4575.923728,"juros":2120.0,"mesDoTeto":9,"totalPago":5107.722173,"jurosEEncargos":2500.0,"jurosEEncargosSemTeto":4955.923728,"custoTotal":2607.722173,"primeiraLinha":{"mes":1,"parcela":315.151913,"juros":277.858162,"amortizacao":37.29375,"saldo":2950.428423,"jurosAcumulados":657.858162},"ultimaLinha":{"mes":24,"parcela":288.336608,"juros":0.0,"amortizacao":288.336608,"saldo":0.0,"jurosAcumulados":2500.0},"linhaDoTeto":{"mes":9,"parcela":90.536313,"juros":14.574145,"amortizacao":75.962169,"saldo":2495.970559,"jurosAcumulados":2500.0}},"emprestimo":{"valorFinanciado":2575.335526,"iof":75.335526,"parcela":186.636885,"totalPago":4479.285248,"totalJuros":1903.949722,"custoTotal":1979.285248}},
 {"nome":"1000 paga 0, 15%/9,5%, 60x, emp 6%","entrada":{"fatura":1000.0,"pagamento":0.0,"taxaDoRotativo":0.15,"taxaDoParcelamento":0.095,"parcelas":60,"taxaDoEmprestimo":0.06},"valorOriginal":1000.0,"teto":1000.0,"dividaMaxima":2000.0,"mesesParaDobrar":5,"rotativo":{"juros":150.0,"iof":6.26,"proximaFatura":1156.26},"parcelamento":{"saldoParcelado":1196.502139,"iof":40.242139,"parcela":114.160501,"parcelas":60,"jurosSemTeto":5653.127917,"juros":850.0,"mesDoTeto":8,"totalPago":2046.502139,"jurosEEncargos":1000.0,"jurosEEncargosSemTeto":5803.127917,"custoTotal":1046.502139,"primeiraLinha":{"mes":1,"parcela":114.160501,"juros":113.667703,"amortizacao":0.492798,"saldo":1196.009341,"jurosAcumulados":263.667703},"ultimaLinha":{"mes":60,"parcela":104.256165,"juros":0.0,"amortizacao":104.256165,"saldo":0.0,"jurosAcumulados":1000.0},"linhaDoTeto":{"mes":8,"parcela":56.410711,"juros":55.48053,"amortizacao":0.930181,"saldo":1190.967922,"jurosAcumulados":1000.0}},"emprestimo":{"valorFinanciado":1034.492574,"iof":34.492574,"parcela":64.009974,"totalPago":3840.598466,"totalJuros":2806.105892,"custoTotal":2840.598466}},
 {"nome":"1000 paga 500, taxas zero, 1x","entrada":{"fatura":1000.0,"pagamento":500.0,"taxaDoRotativo":0.0,"taxaDoParcelamento":0.0,"parcelas":1,"taxaDoEmprestimo":0.0},"valorOriginal":500.0,"teto":500.0,"dividaMaxima":1000.0,"mesesParaDobrar":null,"rotativo":{"juros":0.0,"iof":3.13,"proximaFatura":503.13},"parcelamento":{"saldoParcelado":506.299434,"iof":3.169434,"parcela":506.299434,"parcelas":1,"jurosSemTeto":0.0,"juros":0.0,"mesDoTeto":null,"totalPago":506.299434,"jurosEEncargos":0.0,"jurosEEncargosSemTeto":0.0,"custoTotal":6.299434,"primeiraLinha":{"mes":1,"parcela":506.299434,"juros":0.0,"amortizacao":506.299434,"saldo":0.0,"jurosAcumulados":0.0},"ultimaLinha":{"mes":1,"parcela":506.299434,"juros":0.0,"amortizacao":506.299434,"saldo":0.0,"jurosAcumulados":0.0}},"emprestimo":{"valorFinanciado":503.149717,"iof":3.149717,"parcela":503.149717,"totalPago":503.149717,"totalJuros":0.0,"custoTotal":3.149717}},
 {"nome":"3000 paga 2999, 20%/12%, 6x, emp 3%","entrada":{"fatura":3000.0,"pagamento":2999.0,"taxaDoRotativo":0.2,"taxaDoParcelamento":0.12,"parcelas":6,"taxaDoEmprestimo":0.03},"valorOriginal":1.0,"teto":1.0,"dividaMaxima":2.0,"mesesParaDobrar":4,"rotativo":{"juros":0.2,"iof":0.00626,"proximaFatura":1.20626},"parcelamento":{"saldoParcelado":1.222416,"iof":0.016156,"parcela":0.297323,"parcelas":6,"jurosSemTeto":0.561522,"juros":0.561522,"mesDoTeto":null,"totalPago":1.783939,"jurosEEncargos":0.761522,"jurosEEncargosSemTeto":0.761522,"custoTotal":0.783939,"primeiraLinha":{"mes":1,"parcela":0.297323,"juros":0.14669,"amortizacao":0.150633,"saldo":1.071783,"jurosAcumulados":0.34669},"ultimaLinha":{"mes":6,"parcela":0.297323,"juros":0.031856,"amortizacao":0.265467,"saldo":0.0,"jurosAcumulados":0.761522}},"emprestimo":{"valorFinanciado":1.012783,"iof":0.012783,"parcela":0.186957,"totalPago":1.121744,"totalJuros":0.10896,"custoTotal":0.121744}},
 {"nome":"500 paga 100, 15%/15%, 12x, emp 6%","entrada":{"fatura":500.0,"pagamento":100.0,"taxaDoRotativo":0.15,"taxaDoParcelamento":0.15,"parcelas":12,"taxaDoEmprestimo":0.06},"valorOriginal":400.0,"teto":400.0,"dividaMaxima":800.0,"mesesParaDobrar":5,"rotativo":{"juros":60.0,"iof":2.504,"proximaFatura":462.504},"parcelamento":{"saldoParcelado":473.734257,"iof":11.230257,"parcela":87.394864,"parcelas":12,"jurosSemTeto":575.004105,"juros":340.0,"mesDoTeto":6,"totalPago":813.734257,"jurosEEncargos":400.0,"jurosEEncargosSemTeto":635.004105,"custoTotal":413.734257,"primeiraLinha":{"mes":1,"parcela":87.394864,"juros":71.060139,"amortizacao":16.334725,"saldo":457.399533,"jurosAcumulados":131.060139},"ultimaLinha":{"mes":12,"parcela":75.995533,"juros":0.0,"amortizacao":75.995533,"saldo":0.0,"jurosAcumulados":400.0},"linhaDoTeto":{"mes":6,"parcela":46.015592,"juros":13.160625,"amortizacao":32.854966,"saldo":330.744348,"jurosAcumulados":400.0}},"emprestimo":{"valorFinanciado":408.782403,"iof":8.782403,"parcela":48.758351,"totalPago":585.100209,"totalJuros":176.317805,"custoTotal":185.100209}},
 {"nome":"10000 paga 1500, 15,2%/9,3%, 36x, emp 4%","entrada":{"fatura":10000.0,"pagamento":1500.0,"taxaDoRotativo":0.152,"taxaDoParcelamento":0.093,"parcelas":36,"taxaDoEmprestimo":0.04},"valorOriginal":8500.0,"teto":8500.0,"dividaMaxima":17000.0,"mesesParaDobrar":5,"rotativo":{"juros":1292.0,"iof":53.21,"proximaFatura":9845.21},"parcelamento":{"saldoParcelado":10179.178359,"iof":333.968359,"parcela":986.835155,"parcelas":36,"jurosSemTeto":25346.88723,"juros":7208.0,"mesDoTeto":8,"totalPago":17387.178359,"jurosEEncargos":8500.0,"jurosEEncargosSemTeto":26638.88723,"custoTotal":8887.178359,"primeiraLinha":{"mes":1,"parcela":986.835155,"juros":946.663587,"amortizacao":40.171568,"saldo":10139.006791,"jurosAcumulados":2238.663587},"ultimaLinha":{"mes":36,"parcela":902.868395,"juros":0.0,"amortizacao":902.868395,"saldo":0.0,"jurosAcumulados":8500.0},"linhaDoTeto":{"mes":8,"parcela":748.028254,"juros":673.166515,"amortizacao":74.86174,"saldo":9731.304018,"jurosAcumulados":8500.0}},"emprestimo":{"valorFinanciado":8774.216449,"iof":274.216449,"parcela":464.040914,"totalPago":16705.472921,"totalJuros":7931.256472,"custoTotal":8205.472921}}
];

for(const c of CASOS)test(`caso: ${c.nome}`,()=>{
 const r=simularRotativo(c.entrada);
 perto(r.valorOriginal,c.valorOriginal);perto(r.teto,c.teto);perto(r.dividaMaxima,c.dividaMaxima);
 assert.equal(r.mesesParaDobrar,c.mesesParaDobrar);
 for(const k of ['juros','iof','proximaFatura'])perto(r.rotativo[k],c.rotativo[k]);
 const p=r.parcelamento,e=c.parcelamento;
 assert.equal(p.parcelas,c.entrada.parcelas);assert.equal(p.linhas.length,c.entrada.parcelas);
 assert.equal(p.mesDoTeto,e.mesDoTeto);
 for(const k of ['saldoParcelado','iof','parcela','jurosSemTeto','juros','totalPago','jurosEEncargos','jurosEEncargosSemTeto','custoTotal'])perto(p[k],e[k]);
 const linha=(l,esperada)=>{for(const k of ['mes','parcela','juros','amortizacao','saldo','jurosAcumulados'])perto(l[k],esperada[k]);};
 linha(p.linhas[0],e.primeiraLinha);linha(p.linhas[p.linhas.length-1],e.ultimaLinha);
 if(e.linhaDoTeto)linha(p.linhas[e.mesDoTeto-1],e.linhaDoTeto);
 for(const k of ['valorFinanciado','iof','parcela','totalPago','totalJuros','custoTotal'])perto(r.emprestimo[k],c.emprestimo[k]);
});

test('o caminho do empréstimo é o mesmo empréstimo da calculadora de empréstimo (valor original, IOF financiado, sem tarifa)',()=>{
 const r=simularRotativo(PADRAO);
 const e=simularEmprestimo({valor:850,taxa:0.06,meses:12});
 perto(r.emprestimo.totalPago,e.totalPago);perto(r.emprestimo.cetAnual,e.cetAnual);perto(r.emprestimo.iof,e.iof);
});

// Propriedades sobre fatura × pagamento × taxas × parcelas: o teto nunca é ultrapassado, as linhas fecham, o IOF fica fora.
test('propriedades: juros e encargos nunca passam do teto, o corte só diminui, as linhas somam e o saldo zera',()=>{
 let semente=20261029;
 const sorteio=()=>{semente=(semente*1103515245+12345)%2147483648;return semente/2147483648;};
 let comTeto=0;
 for(let i=0;i<2000;i++){
  const fatura=50+sorteio()*20000,pagamento=sorteio()<0.2?0:sorteio()*fatura*0.99;
  const taxaDoRotativo=sorteio()*0.5,taxaDoParcelamento=sorteio()*0.3,taxaDoEmprestimo=sorteio()*0.15,parcelas=1+Math.floor(sorteio()*PARCELAS_MAXIMAS);
  const e={fatura,pagamento,taxaDoRotativo,taxaDoParcelamento,parcelas,taxaDoEmprestimo};
  const r=simularRotativo(e),p=r.parcelamento;
  const V=fatura-pagamento;
  perto(r.valorOriginal,V);perto(r.teto,V*TETO_DOS_JUROS);perto(r.dividaMaxima,V+r.teto);
  assert.ok(p.jurosEEncargos<=r.teto+1e-6,`juros e encargos ${p.jurosEEncargos} acima do teto ${r.teto}`);
  assert.ok(p.juros<=p.jurosSemTeto+1e-9&&p.jurosEEncargos<=p.jurosEEncargosSemTeto+1e-9,'o teto só diminui');
  if(p.mesDoTeto===null)perto(p.juros,p.jurosSemTeto);else{perto(p.jurosEEncargos,r.teto);comTeto++;assert.ok(p.mesDoTeto>=1&&p.mesDoTeto<=parcelas);}
  perto(p.totalPago,p.linhas.reduce((s,l)=>s+l.parcela,0));
  perto(p.totalPago-V,p.custoTotal);
  perto(p.linhas[p.linhas.length-1].saldo,0);
  perto(p.linhas[p.linhas.length-1].jurosAcumulados,p.jurosEEncargos);
  let anterior=r.rotativo.juros;
  for(const l of p.linhas){
   assert.ok(l.juros>=-1e-9&&l.amortizacao>=-1e-9&&l.saldo>=-1e-9,'nada negativo');
   assert.ok(l.jurosAcumulados>=anterior-1e-9&&l.jurosAcumulados<=r.teto+1e-6,'juros acumulados crescem até o teto');
   perto(l.parcela,l.juros+l.amortizacao);
   anterior=l.jurosAcumulados;
  }
  // O IOF é tributo e fica fora do teto: tirando o IOF, o que se paga nunca passa da dívida máxima (valor original × 2).
  assert.ok(p.totalPago-r.rotativo.iof-p.iof<=r.dividaMaxima+1e-6,'sem o IOF, o total pago cabe na dívida máxima');
  assert.ok(r.rotativo.iof>=0&&p.iof>=0&&r.emprestimo.iof>=0);
  perto(r.rotativo.proximaFatura,V+r.rotativo.juros+r.rotativo.iof);
 }
 assert.ok(comTeto>200,`o sorteio precisa cobrir casos com o teto atingido (${comTeto})`);
});

test('erros em português: fatura, pagamento, taxas e parcelas fora do permitido',()=>{
 const erro=(e,re)=>assert.throws(()=>simularRotativo({...PADRAO,...e}),{name:'RangeError',message:re});
 erro({fatura:0},/fatura/);
 erro({fatura:NaN},/fatura/);
 erro({pagamento:-1},/pagamento/i);
 erro({pagamento:1000},/fatura inteira/);
 erro({pagamento:1200},/fatura inteira/);
 erro({taxaDoRotativo:1},/rotativo/);
 erro({taxaDoRotativo:-0.1},/rotativo/);
 erro({taxaDoParcelamento:1.5},/parcelamento/);
 erro({taxaDoEmprestimo:NaN},/empréstimo/);
 erro({parcelas:0},/parcelas/);
 erro({parcelas:61},/parcelas/);
 erro({parcelas:2.5},/parcelas/);
});

test('a página do rotativo está em caminhosPublicos e no sitemap com a sua revisão, com a frase de honestidade',()=>{
 const f=ferramentas.find(x=>x.slug==='cartao-rotativo');
 assert.ok(f,'cartao-rotativo em lib/ferramentas.ts');
 assert.equal(f.categoria,'Comprar e comparar');
 assert.ok(caminhosPublicos(config.emailContato).includes('/cartao-rotativo'));
 const c=conteudos['cartao-rotativo'];
 assert.match(c.revisadoEm,DATA);
 assert.ok(xmlSitemap(config,revisoesPorCaminho(conteudos)).includes(`<url><loc>${config.origem}/cartao-rotativo</loc><lastmod>${c.revisadoEm}</lastmod></url>`));
 assert.ok(c.exemplos.length>=3&&c.passos.length>=2&&c.perguntas.length>=4);
 assert.match(c.atencao,/não é previsão nem recomendação/i);
 assert.match(c.atencao,/valores que você digitou/i);
 assert.match(c.atencao,/oferta de crédito/i,'o texto diz que não é oferta de crédito');
 assert.match(c.atencao+c.introducao,/14\.690/,'cita a Lei 14.690/2023');
 assert.match(c.atencao+c.perguntas.map(p=>p.resposta).join(' '),/IOF/,'explica que o IOF fica fora do teto');
});

// Os exemplos da página saem da mesma conta que a tela usa: o texto não pode mostrar um número que a calculadora não dá.
test('os números dos exemplos da página (R$ 1.000 em 12×; R$ 2.500 em 24× com o teto; R$ 1.000 em 60×) são os da conta',()=>{
 const semNbsp=s=>s.replace(/ /g,' ');
 const texto=semNbsp(conteudos['cartao-rotativo'].exemplos.map(e=>e.titulo+' '+e.conta+' '+e.leitura).join(' '));
 const reais=v=>semNbsp(v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
 const confere=(entrada,numeros)=>{const r=simularRotativo(entrada);for(const pegar of numeros){const v=reais(pegar(r));assert.ok(texto.includes(v),`${v} está no texto dos exemplos`);}};
 confere(CASOS[0].entrada,[r=>r.rotativo.juros,r=>r.rotativo.iof,r=>r.rotativo.proximaFatura,r=>r.parcelamento.parcela,r=>r.parcelamento.totalPago,r=>r.parcelamento.jurosEEncargos,r=>r.teto,r=>r.emprestimo.parcela,r=>r.emprestimo.totalPago]);
 confere(CASOS[1].entrada,[r=>r.rotativo.juros,r=>r.parcelamento.jurosEEncargosSemTeto,r=>r.teto,r=>r.parcelamento.totalPago,r=>r.emprestimo.totalPago]);
 confere(CASOS[2].entrada,[r=>r.parcelamento.parcela,r=>r.parcelamento.totalPago,r=>r.parcelamento.jurosEEncargosSemTeto,r=>r.emprestimo.totalPago]);
 assert.equal(simularRotativo(CASOS[1].entrada).parcelamento.mesDoTeto,9);
 assert.equal(simularRotativo(CASOS[2].entrada).parcelamento.mesDoTeto,8);
});
