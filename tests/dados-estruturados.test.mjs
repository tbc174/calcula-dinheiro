// Tarefa 10 do plano de receita com AdSense: sitemap com a data de revisão de cada página e dados estruturados do
// site (WebSite + Organization em toda página; FAQPage só com perguntas que aparecem na tela).
// Por quê: um <lastmod> único e global diz ao Google que tudo mudou no mesmo dia (ele passa a ignorá-lo), e uma
// página nova fora do sitemap demora a ser achada. Os testes conferem a regra, não o texto.
import test from 'node:test';
import assert from 'node:assert/strict';
import {caminhosPublicos,xmlSitemap,revisoesPorCaminho,dadosEstruturadosSite,dadosEstruturadosFaq,serializarSchema} from '../lib/publicacao.mjs';
import {ferramentas} from '../lib/ferramentas.ts';
import {conteudos} from '../lib/conteudo.ts';
import config from '../config/publicacao.json' with {type:'json'};

const base={origem:'https://exemplo.test',emailContato:'contato@exemplo.test',revisadoEm:'2026-10-25'};
const DATA=/^\d{4}-\d{2}-\d{2}$/;
const lastmods=xml=>Object.fromEntries([...xml.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g)].map(m=>[new URL(m[1]).pathname,m[2]]));

test('cada URL do sitemap leva a data de revisão da própria página; sem data própria, a do site',()=>{
 const xml=xmlSitemap(base,{'/juros-compostos':'2026-10-24','/sobre':'2026-10-26'});
 const datas=lastmods(xml);
 assert.equal(datas['/juros-compostos'],'2026-10-24');
 assert.equal(datas['/sobre'],'2026-10-26');
 assert.equal(datas['/'],'2026-10-25');
 assert.equal(datas['/porcentagem'],'2026-10-25');
 assert.deepEqual(Object.keys(datas).sort(),caminhosPublicos(base.emailContato).sort(),'todas as páginas públicas, e só elas');
 assert.equal(xmlSitemap(base),xmlSitemap(base,{}),'sem revisões, igual ao de antes');
});

test('data de revisão fora do formato AAAA-MM-DD não entra no sitemap',()=>{
 const datas=lastmods(xmlSitemap(base,{'/sobre':'26/10/2026','/termos':'','/privacidade':'2026-10-26<script>'}));
 for(const p of ['/sobre','/termos','/privacidade'])assert.equal(datas[p],'2026-10-25',p);
});

test('toda calculadora está em caminhosPublicos e no sitemap com a sua data de revisão (risco 7 do plano)',()=>{
 const publicos=caminhosPublicos(config.emailContato);
 const revisoes=revisoesPorCaminho(conteudos);
 const datas=lastmods(xmlSitemap(config,revisoes));
 for(const f of ferramentas){
  const caminho='/'+f.slug, c=conteudos[f.slug];
  assert.ok(publicos.includes(caminho),`${caminho} fora de caminhosPublicos`);
  assert.match(c.revisadoEm,DATA,`${caminho}: revisadoEm no formato AAAA-MM-DD`);
  assert.equal(revisoes[caminho],c.revisadoEm,`${caminho}: revisão por caminho`);
  assert.equal(datas[caminho],c.revisadoEm,`${caminho}: lastmod do sitemap`);
 }
 assert.equal(Object.keys(revisoes).length,ferramentas.length,'uma revisão por calculadora, nenhuma a mais');
 assert.match(config.revisadoEm,DATA,'a data do site também é AAAA-MM-DD');
});

test('WebSite e Organization com @id estáveis, nome e idioma; o site aponta para a organização',()=>{
 const g=dadosEstruturadosSite(base);
 assert.equal(g['@context'],'https://schema.org');
 const site=g['@graph'].find(n=>n['@type']==='WebSite'), org=g['@graph'].find(n=>n['@type']==='Organization');
 assert.equal(g['@graph'].length,2);
 assert.equal(site['@id'],'https://exemplo.test/#site');
 assert.equal(site.url,'https://exemplo.test/');
 assert.equal(site.name,'Calcula Dinheiro');
 assert.equal(site.inLanguage,'pt-BR');
 assert.deepEqual(site.publisher,{'@id':'https://exemplo.test/#org'});
 assert.equal(org['@id'],'https://exemplo.test/#org');
 assert.equal(org.name,'Calcula Dinheiro');
 assert.equal(org.url,'https://exemplo.test/');
 assert.equal(org.logo,'https://exemplo.test/favicon.svg');
 assert.ok(!JSON.stringify(g).includes(base.emailContato),'sem e-mail nos dados estruturados');
});

test('FAQPage só existe quando há perguntas visíveis, e reproduz exatamente elas',()=>{
 assert.equal(dadosEstruturadosFaq([],'https://exemplo.test/x'),null);
 assert.equal(dadosEstruturadosFaq(undefined,'https://exemplo.test/x'),null);
 const perguntas=[{pergunta:'Como funciona?',resposta:'Assim.'},{pergunta:'E depois?',resposta:'Depois <b>aquilo</b>.'}];
 const faq=dadosEstruturadosFaq(perguntas,'https://exemplo.test/x');
 assert.equal(faq['@context'],'https://schema.org');
 assert.equal(faq['@type'],'FAQPage');
 assert.equal(faq['@id'],'https://exemplo.test/x#faq');
 assert.deepEqual(faq.mainEntity,perguntas.map(p=>({'@type':'Question',name:p.pergunta,acceptedAnswer:{'@type':'Answer',text:p.resposta}})));
 assert.equal(faq.mainEntity.length,2,'nenhuma pergunta a mais do que as da tela');
});

test('a serialização dos esquemas é JSON válido e não deixa "<" solto dentro do <script>',()=>{
 const perguntas=[{pergunta:'</script><script>alert(1)</script>',resposta:'a < b'}];
 for(const v of [dadosEstruturadosSite(base),dadosEstruturadosFaq(perguntas,'https://exemplo.test/x')]){
  const s=serializarSchema(v);
  assert.ok(!s.includes('<'),'sem "<" no texto do script');
  assert.deepEqual(JSON.parse(s),v,'JSON.parse devolve o mesmo objeto');
 }
});

test('as perguntas de cada calculadora, quando houver, têm pergunta e resposta preenchidas',()=>{
 for(const [slug,c] of Object.entries(conteudos))for(const p of c.perguntas??[]){
  assert.ok(p.pergunta.trim().length>0&&p.resposta.trim().length>0,`${slug}: pergunta ou resposta vazia`);
 }
});
