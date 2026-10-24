import test from 'node:test';
import assert from 'node:assert/strict';
import {publicarHost,redirecionarDominio,normalizarPublisher,textoAds,anunciosProntos,consentimentoValido,aceitaTcf} from '../lib/publicacao.mjs';
const origem='https://calculadinheiro.com.br';
test('indexação somente no domínio final, sem liberar prévia ou host parecido',()=>{
 assert.equal(publicarHost('calculadinheiro.com.br',origem),true);
 for(const host of ['localhost:5173','calcula-dinheiro.vastmyna11.chatgpt.site','calculadinheiro.com.br.evil.com','www.calculadinheiro.com.br','',null])assert.equal(publicarHost(host,origem),false);
});
test('www redireciona com caminho e consulta preservados; outros hosts não',()=>{
 assert.equal(redirecionarDominio('https://www.calculadinheiro.com.br/juros-compostos?a=1',origem),'https://calculadinheiro.com.br/juros-compostos?a=1');
 assert.equal(redirecionarDominio('https://preview.chatgpt.site/x',origem),null);
 assert.equal(redirecionarDominio('https://calculadinheiro.com.br/x',origem),null);
});
test('publisher e ads.txt exigem ID real bem formado; ausente não fabrica credencial',()=>{
 assert.equal(normalizarPublisher('ca-pub-1234567890123456'),'ca-pub-1234567890123456');
 assert.equal(normalizarPublisher('pub-1234567890123456'),'ca-pub-1234567890123456');
 for(const s of ['',null,'ca-pub-0000000000000000','pub-1','x\n<script>'])assert.equal(normalizarPublisher(s),null);
 assert.equal(textoAds('pub-1234567890123456'),'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
 assert.equal(textoAds(''),null);
});
test('publicidade exige modo ativo, slot e CMP confirmada',()=>{
 const a={publisherId:'pub-1234567890123456',modo:'ativo',slotRodape:'1234567890',cmpScriptUrl:'https://fundingchoicesmessages.google.com/i/pub-1234567890123456?ers=1',cmpValidada:true};
 assert.equal(anunciosProntos(a),true);
 for(const patch of [{modo:'verificacao'},{cmpValidada:false},{publisherId:''},{slotRodape:''},{cmpScriptUrl:'https://outro.example/script.js'}])assert.equal(anunciosProntos({...a,...patch}),false);
});
test('consentimento expira, recusa e formato antigo não liberam publicidade',()=>{
 const agora=1000000;const c={versao:1,publicidade:true,expira:agora+10000};
 assert.equal(consentimentoValido(c,agora),true);
 for(const c of [null,{}, {versao:1,publicidade:false,expira:agora+100}, {versao:1,publicidade:true,expira:agora-1}, {versao:0,publicidade:true,expira:agora+100}])assert.equal(consentimentoValido(c,agora),false);
});
test('CMP ainda carregando ou sem permissão não libera pedidos de anúncio',()=>{
 assert.equal(aceitaTcf({eventStatus:'tcloaded',gdprApplies:false}),true);
 const c={eventStatus:'useractioncomplete',gdprApplies:true,purpose:{consents:{1:true}},vendor:{consents:{755:true}}};
 assert.equal(aceitaTcf(c),true);
 assert.equal(aceitaTcf({...c,eventStatus:'cmpuishown'}),false);
 assert.equal(aceitaTcf({...c,purpose:{consents:{1:false}}}),false);
 assert.equal(aceitaTcf({...c,vendor:{consents:{755:false}}}),false);
 assert.equal(aceitaTcf({eventStatus:'tcloaded'}),false);
});
