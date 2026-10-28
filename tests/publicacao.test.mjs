import test from 'node:test';
import assert from 'node:assert/strict';
import {publicarHost,redirecionarDominio,normalizarPublisher,textoAds,anunciosProntos,slotDe,publicidadeRecusada} from '../lib/publicacao.mjs';
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
test('publicidade exige modo ativo, publisher e slot do rodapé',()=>{
 const a={publisherId:'pub-1234567890123456',modo:'ativo',slotRodape:'1234567890'};
 assert.equal(anunciosProntos(a),true);
 for(const patch of [{modo:'verificacao'},{publisherId:''},{slotRodape:''},{slotRodape:'12345'}])assert.equal(anunciosProntos({...a,...patch}),false);
});
test('cada posição usa o próprio slot e, sem ele, o do rodapé',()=>{
 const a={slotRodape:'1111111111',slots:{resultado:'2222222222',conteudo:''}};
 assert.equal(slotDe(a,'resultado'),'2222222222');
 assert.equal(slotDe(a,'conteudo'),'1111111111');
 assert.equal(slotDe(a,'rodape'),'1111111111');
 assert.equal(slotDe({...a,slots:{resultado:'x"><script>'}},'resultado'),'1111111111');
 assert.equal(slotDe({slotRodape:'1111111111'},'resultado'),'1111111111');
});
test('só uma recusa válida e dentro do prazo desliga a publicidade',()=>{
 const agora=1000000;
 assert.equal(publicidadeRecusada({versao:1,publicidade:false,expira:agora+10000},agora),true);
 for(const c of [null,{},{versao:1,publicidade:true,expira:agora+100},{versao:1,publicidade:false,expira:agora-1},{versao:0,publicidade:false,expira:agora+100}])assert.equal(publicidadeRecusada(c,agora),false);
});
