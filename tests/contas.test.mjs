import test from 'node:test';
import assert from 'node:assert/strict';
import { juros, metaMensal, porcentagem, compararPagamento, corrigirIpca, converterMoeda, lerNumero } from '../lib/contas.mjs';

const perto=(a,b,erro=.000001)=>assert.ok(Math.abs(a-b)<erro,`${a} ≠ ${b}`);
test('juros: aporte no fim do mês e referência independente',()=>{
 const r=juros({inicial:1000,mensal:100,taxa:1,unidadeTaxa:'mes',meses:12});
 perto(r.saldo,2395.0753314517);perto(r.aplicado,2200);perto(r.linhas[1].saldo,1110);
 perto(juros({inicial:1000,mensal:200,taxa:1,unidadeTaxa:'mes',meses:12}).saldo,3663.3256321115,.0001);
});
test('juros: taxa zero, taxa anual equivalente e prazo inválido',()=>{
 perto(juros({inicial:500,mensal:200,taxa:0,unidadeTaxa:'mes',meses:12}).saldo,2900);
 const a=juros({inicial:1000,mensal:100,taxa:1,unidadeTaxa:'mes',meses:24});
 const b=juros({inicial:1000,mensal:100,taxa:((1.01**12)-1)*100,unidadeTaxa:'ano',meses:24});
 perto(a.saldo,b.saldo);assert.throws(()=>juros({inicial:1,mensal:1,taxa:1,unidadeTaxa:'mes',meses:0}));
});
test('meta: rendimento opcional, reconciliação e meta já atingida',()=>{
 perto(metaMensal({meta:10000,inicial:1000,taxa:0,meses:24}).mensal,375);
 const r=metaMensal({meta:10000,inicial:1000,taxa:1,meses:24});perto(r.saldo,10000);
 assert.equal(metaMensal({meta:500,inicial:1000,taxa:0,meses:12}).mensal,0);
});
test('porcentagem: quatro operações, base zero e desconto completo',()=>{
 perto(porcentagem({modo:'parte',a:200,b:15}).resultado,30);
 perto(porcentagem({modo:'proporcao',a:50,b:200}).resultado,25);
 perto(porcentagem({modo:'ajuste',a:200,b:100,operacao:'desconto'}).resultado,0);
 perto(porcentagem({modo:'variacao',a:100,b:125}).resultado,25);
 assert.throws(()=>porcentagem({modo:'proporcao',a:1,b:0}));
 assert.throws(()=>porcentagem({modo:'variacao',a:0,b:100}));
});
test('parcelamento: entrada somada uma vez, empate e preço base positivo',()=>{
 const r=compararPagamento({vista:900,entrada:200,parcelas:4,parcela:200});
 perto(r.total,1000);perto(r.diferenca,100);perto(r.percentual,100/9);
 assert.equal(compararPagamento({vista:1000,entrada:0,parcelas:5,parcela:200}).melhor,'empate');
 assert.throws(()=>compararPagamento({vista:0,entrada:0,parcelas:5,parcela:200}));
});
test('IPCA: inclui as duas pontas, deflação, mês único e rejeita lacunas',()=>{
 const serie=[['2024-01',.01],['2024-02',-.005],['2024-03',.02]];
 perto(corrigirIpca(1000,'2024-01','2024-03',serie).corrigido,1025.049);
 perto(corrigirIpca(1000,'2024-02','2024-02',serie).corrigido,995);
 assert.throws(()=>corrigirIpca(1000,'2024-01','2024-03',[serie[0],serie[2]]));
 assert.throws(()=>corrigirIpca(1000,'2024-03','2024-01',serie));
});
test('câmbio: direção, moeda igual e mesma data para cruzamento',()=>{
 const cotacoes=[{codigo:'USD',venda:5,data:'2026-10-23'},{codigo:'EUR',venda:6,data:'2026-10-23'}];
 perto(converterMoeda(100,'USD','BRL',cotacoes).resultado,500);
 perto(converterMoeda(600,'BRL','EUR',cotacoes).resultado,100);
 perto(converterMoeda(100,'USD','EUR',cotacoes).resultado,500/6);
 perto(converterMoeda(100,'USD','USD',[]).resultado,100);
 assert.throws(()=>converterMoeda(100,'USD','EUR',[cotacoes[0],{...cotacoes[1],data:'2026-10-22'}]));
});
test('entradas brasileiras e rejeição de texto ambíguo',()=>{
 perto(lerNumero('1.234,56'),1234.56);perto(lerNumero('0,8'),.8);perto(lerNumero('0'),0);
 assert.throws(()=>lerNumero(''));assert.throws(()=>lerNumero('1.2.3'));assert.throws(()=>lerNumero('-2'));
});
