// Teste de integração: sobe o servidor construído (dist/standalone) e confere que o título, a description e o
// canonical chegam DENTRO do <head> no HTML enviado, para o Googlebot e para um navegador comum.
// Por quê: em 28/10/2026 o Search Console mostrava canonical "Nenhum" porque esses metadados saíam no corpo da
// página (streaming de metadados), perto do byte 19.000, enquanto o </head> fechava no byte 1.767.
// Precisa do build: `npm run build` antes de `npm run test:site`.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import config from '../../config/publicacao.json' with {type:'json'};
import {tokenWebAnalytics} from '../../lib/publicacao.mjs';
import {conteudos} from '../../lib/conteudo.ts';

const raiz=path.resolve(import.meta.dirname,'..','..');
const servidor=path.join(raiz,'dist','standalone','server.js');
const hostFinal=new URL(config.origem).host;
const agentes={
 googlebot:'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/120.0.0.0 Safari/537.36',
 chrome:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};
const paginas=['/','/quanto-guardar-por-mes','/financiamento','/sobre'];

function portaLivre(){return new Promise((res,rej)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>res(port))});s.on('error',rej)})}
function baixar(porta,caminho,agente,host){return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:porta,path:caminho,headers:{'user-agent':agente,host,accept:'text/html'}},r=>{let corpo='';r.setEncoding('utf8');r.on('data',d=>corpo+=d);r.on('end',()=>res({status:r.statusCode,corpo}))});req.on('error',rej);req.end()})}
async function esperarServidor(porta){for(let i=0;i<60;i++){try{const r=await baixar(porta,'/',agentes.chrome,hostFinal);if(r.status===200)return}catch{}await new Promise(r=>setTimeout(r,500))}throw new Error('o servidor não respondeu em 30 s')}

function posicoes(html){const head=html.indexOf('</head>');return {head,titulo:html.indexOf('<title>'),descricao:html.search(/<meta name="description"/),canonical:html.search(/<link rel="canonical"/)}}

test('título, description e canonical ficam dentro do <head> para robôs e navegadores',async t=>{
 assert.ok(existsSync(servidor),'rode `npm run build` antes deste teste: falta '+servidor);
 const porta=await portaLivre();
 const proc=spawn(process.execPath,[servidor],{env:{...process.env,HOST:'127.0.0.1',PORT:String(porta),NODE_ENV:'production'},stdio:['ignore','pipe','pipe']});
 let saida='';proc.stdout.on('data',d=>saida+=d);proc.stderr.on('data',d=>saida+=d);
 t.after(()=>proc.kill());
 try{await esperarServidor(porta)}catch(e){throw new Error(e.message+'\n'+saida)}
 for(const caminho of paginas)for(const [nome,agente] of Object.entries(agentes)){
  const {status,corpo}=await baixar(porta,caminho,agente,hostFinal);
  assert.equal(status,200,`${caminho} (${nome})`);
  const p=posicoes(corpo);
  assert.ok(p.head>0,`${caminho} (${nome}): sem </head>`);
  for(const campo of ['titulo','descricao','canonical'])assert.ok(p[campo]>0&&p[campo]<p.head,`${caminho} (${nome}): ${campo} fora do <head> (posição ${p[campo]}, </head> em ${p.head})`);
  assert.equal(corpo.split('<title>').length-1,1,`${caminho} (${nome}): um só <title>`);
  assert.match(corpo.slice(0,p.head),/<link rel="canonical" href="https:\/\/calculadinheiro\.com\.br[^"]*"/,`${caminho} (${nome}): canonical absoluto`);
  assert.match(corpo.slice(0,p.head),/<meta name="robots" content="index, follow"/,`${caminho} (${nome}): robots index no domínio final`);
  // Medição de visitas (Cloudflare Web Analytics): o beacon está no HTML exatamente quando há token na configuração.
  const token=tokenWebAnalytics(config.webAnalytics?.token);
  const beacons=corpo.match(/<script defer="" src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js" data-cf-beacon="[^"]*"><\/script>/g)||[];
  assert.equal(beacons.length,token?1:0,`${caminho} (${nome}): beacon ${token?'presente uma vez':'ausente sem token'}`);
  if(token)assert.ok(beacons[0].includes('&quot;token&quot;:&quot;'+token+'&quot;'),`${caminho} (${nome}): token no beacon`);
  // Dados estruturados do site (Tarefa 10): WebSite + Organization em toda página, num JSON-LD que o JSON.parse aceita.
  const esquemas=[...corpo.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const doSite=esquemas.filter(e=>Array.isArray(e['@graph'])&&e['@graph'].some(n=>n['@type']==='WebSite'));
  assert.equal(doSite.length,1,`${caminho} (${nome}): um JSON-LD com WebSite`);
  const tipos=doSite[0]['@graph'].map(n=>n['@type']).sort();
  assert.deepEqual(tipos,['Organization','WebSite'],`${caminho} (${nome}): WebSite e Organization`);
  assert.equal(doSite[0]['@graph'].find(n=>n['@type']==='WebSite').url,config.origem+'/',`${caminho} (${nome}): URL do site`);
  // FAQPage só quando a página mostra perguntas: hoje nenhuma calculadora tem, então nenhum FAQPage pode sair.
  const faqs=esquemas.filter(e=>e['@type']==='FAQPage');
  const perguntasNaTela=(corpo.match(/class="guia-perguntas"/g)||[]).length;
  assert.equal(faqs.length,perguntasNaTela>0?1:0,`${caminho} (${nome}): FAQPage só com perguntas na tela`);
  // Calculadora de financiamento (Tarefa 9): a tela chega renderizada no servidor, com os dois sistemas e a frase de honestidade.
  if(caminho==='/financiamento')for(const trecho of ['SAC','Price','não é previsão nem recomendação'])assert.ok(corpo.includes(trecho),`${caminho} (${nome}): "${trecho}" no HTML`);
 }
 // Sitemap (Tarefa 10): cada calculadora com a sua data de revisão, as outras páginas com a do site.
 const sitemap=await baixar(porta,'/sitemap.xml',agentes.googlebot,hostFinal);
 assert.equal(sitemap.status,200,'sitemap.xml');
 const datas=Object.fromEntries([...sitemap.corpo.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g)].map(m=>[new URL(m[1]).pathname,m[2]]));
 for(const [slug,c] of Object.entries(conteudos))assert.equal(datas['/'+slug],c.revisadoEm,`/${slug}: lastmod é a revisão da página`);
 for(const p of ['/','/sobre','/metodologia','/privacidade','/termos'])assert.equal(datas[p],config.revisadoEm,`${p}: lastmod é a revisão do site`);
 const previa=await baixar(porta,'/',agentes.googlebot,'previa.example.org');
 assert.match(previa.corpo.slice(0,previa.corpo.indexOf('</head>')),/<meta name="robots" content="noindex, nofollow"/,'fora do domínio final a página pede noindex');
});
