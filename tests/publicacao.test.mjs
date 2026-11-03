import test from 'node:test';
import assert from 'node:assert/strict';
import {publicarHost,redirecionarDominio,normalizarPublisher,textoAds,anunciosProntos,consentimentoValido,aceitaTcf,tokenWebAnalytics,beaconWebAnalytics,linkPatrocinado,ATRIBUTOS_DO_LINK_PATROCINADO} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import config from '../config/publicacao.json' with {type:'json'};
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
test('medição de visitas só com token bem formado; sem token, nenhum beacon',()=>{
 const token='0123456789abcdef0123456789abcdef';
 assert.equal(tokenWebAnalytics(token),token);
 assert.deepEqual(beaconWebAnalytics(token),{src:'https://static.cloudflareinsights.com/beacon.min.js',dados:'{"token":"0123456789abcdef0123456789abcdef"}'});
 for(const t of ['',null,undefined,'ABCDEF','0123456789abcdef0123456789abcde','0123456789abcdef0123456789abcdef1','x"><script>'])assert.equal(beaconWebAnalytics(t),null,String(t));
});
test('link patrocinado só com modo ativo, calculadora configurada, texto curto e URL https',()=>{
 const link={texto:'Onde abrir um CDB',programa:'Lomadee',url:'https://parceiro.example/cdb?ref=1'};
 const p={modo:'ativo',porCalculadora:{'quanto-rende':link}};
 assert.deepEqual(linkPatrocinado(p,'quanto-rende'),link);
 assert.equal(linkPatrocinado(p,'financiamento'),null,'calculadora sem link configurado');
 assert.equal(linkPatrocinado({...p,modo:'desligado'},'quanto-rende'),null,'modo desligado');
 assert.equal(linkPatrocinado(null,'quanto-rende'),null,'sem configuração');
 const com=patch=>linkPatrocinado({...p,porCalculadora:{'quanto-rende':{...link,...patch}}},'quanto-rende');
 for(const url of ['http://parceiro.example/cdb','javascript:alert(1)','','/cdb',null])assert.equal(com({url}),null,String(url));
 for(const texto of ['','ab','x\n<script>','a'.repeat(81)])assert.equal(com({texto}),null,JSON.stringify(texto));
 assert.equal(com({programa:''}),null,'programa vazio');
});
test('a configuração do repositório não liga link de afiliado em nenhuma calculadora (entra só depois do "Pronto" do AdSense)',()=>{
 assert.equal(config.parceiros.modo,'desligado');
 for(const f of ferramentas)assert.equal(linkPatrocinado(config.parceiros,f.slug),null,f.slug);
});
test('link patrocinado é marcado como pago para o Google e abre em nova aba sem acesso à janela',()=>{
 assert.match(ATRIBUTOS_DO_LINK_PATROCINADO.rel,/\bsponsored\b/);
 assert.match(ATRIBUTOS_DO_LINK_PATROCINADO.rel,/\bnoopener\b/);
 assert.equal(ATRIBUTOS_DO_LINK_PATROCINADO.target,'_blank');
});

// Regressão de 03/11/2026 (ação 6 do plano mestre): a política negava a análise de audiência com o Cloudflare Web Analytics
// ativo, e as páginas citavam uma pessoa como responsável enquanto a conta do AdSense é da empresa.
test('privacidade declara o Cloudflare Web Analytics e o responsável é a empresa', async () => {
  const {readFileSync}=await import('node:fs');
  const ler=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const privacidade=ler('app/privacidade/page.tsx')+ler('components/publicidade.jsx');
  assert.match(privacidade,/Cloudflare Web Analytics/);
  assert.doesNotMatch(privacidade,/Não usamos (ferramenta de )?análise de audiência/);
  const {responsavel}=JSON.parse(ler('config/publicacao.json'));
  assert.match(responsavel,/CNPJ 69\.760\.092\/0001-04/);
  for(const p of ['app/termos/page.tsx','app/metodologia/page.tsx','components/guia.tsx'])assert.doesNotMatch(ler(p),/(é|projeto:) Tiago/);
});
