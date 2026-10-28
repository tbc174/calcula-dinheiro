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

const raiz=path.resolve(import.meta.dirname,'..','..');
const servidor=path.join(raiz,'dist','standalone','server.js');
const hostFinal=new URL(config.origem).host;
const agentes={
 googlebot:'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/120.0.0.0 Safari/537.36',
 chrome:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};
const paginas=['/','/quanto-guardar-por-mes','/sobre'];

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
 }
 const previa=await baixar(porta,'/',agentes.googlebot,'previa.example.org');
 assert.match(previa.corpo.slice(0,previa.corpo.indexOf('</head>')),/<meta name="robots" content="noindex, nofollow"/,'fora do domínio final a página pede noindex');
});
