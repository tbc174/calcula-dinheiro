export function publicarHost(host,origem){return typeof host==='string'&&host.toLowerCase()===new URL(origem).host}
export function redirecionarDominio(url,origem){const atual=new URL(url),final=new URL(origem);if(atual.hostname!=='www.'+final.hostname)return null;return final.origin+atual.pathname+atual.search}
export function normalizarPublisher(id){if(typeof id!=='string')return null;const m=id.trim().match(/^(?:ca-)?pub-([0-9]{16})$/);return m&&!/^0+$/.test(m[1])?'ca-pub-'+m[1]:null}
export function textoAds(id){const p=normalizarPublisher(id);return p?`google.com, ${p.slice(3)}, DIRECT, f08c47fec0942fa0\n`:null}
export function anunciosProntos(c){if(!c||c.modo!=='ativo'||!normalizarPublisher(c.publisherId)||!/^\d{10}$/.test(c.slotRodape)||c.cmpValidada!==true)return false;try{const u=new URL(c.cmpScriptUrl);return u.protocol==='https:'&&u.hostname==='fundingchoicesmessages.google.com'&&u.pathname==='/i/'+normalizarPublisher(c.publisherId).slice(3)}catch{return false}}
export function consentimentoValido(c,agora=Date.now()){return !!(c&&c.versao===1&&c.publicidade===true&&Number.isFinite(c.expira)&&c.expira>agora)}
export function aceitaTcf(c){if(!c||!['tcloaded','useractioncomplete'].includes(c.eventStatus))return false;if(c.gdprApplies===false)return true;return c.gdprApplies===true&&c.purpose?.consents?.[1]===true&&c.vendor?.consents?.[755]===true}
export function contatoValido(email){return typeof email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!/[\r\n]/.test(email)}
export function caminhosPublicos(email){return ['/','/juros-compostos','/porcentagem','/a-vista-ou-parcelado','/financiamento','/emprestimo','/quanto-rende','/quanto-guardar-por-mes','/salario-liquido','/decimo-terceiro','/correcao-ipca','/conversor-de-moedas','/sobre','/metodologia','/privacidade','/termos',...(contatoValido(email)?['/contato']:[])]}
export function textoRobots(host,config){return publicarHost(host,config.origem)?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /signin-with-chatgpt\nDisallow: /signout-with-chatgpt\nDisallow: /callback\nSitemap: ${config.origem}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n'}
// Data de revisão de uma página: só AAAA-MM-DD. Qualquer outra coisa cai na data do site, para o sitemap nunca mentir nem quebrar.
const DATA_ISO=/^\d{4}-\d{2}-\d{2}$/;
export function dataRevisao(valor,padrao){return typeof valor==='string'&&DATA_ISO.test(valor)?valor:padrao}
// De {slug: conteudo} para {'/slug': revisadoEm}: é o que o sitemap recebe para dar a cada calculadora a sua própria data.
export function revisoesPorCaminho(conteudos){return Object.fromEntries(Object.entries(conteudos).map(([slug,c])=>['/'+slug,c.revisadoEm]))}
// Um <lastmod> por URL: a revisão da página quando há, senão a do site. Um lastmod único e global faz o Google ignorá-lo.
export function xmlSitemap(config,revisoes={}){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+caminhosPublicos(config.emailContato).map(p=>`<url><loc>${config.origem}${p}</loc><lastmod>${dataRevisao(revisoes[p],config.revisadoEm)}</lastmod></url>`).join('')+'</urlset>'}
const NOME_DO_SITE='Calcula Dinheiro';
// Dados estruturados do site inteiro (vão em toda página): qual é o site e quem publica, com @id estáveis para as
// páginas poderem apontar. Sem e-mail nem pessoa: só o nome do site e o logotipo.
export function dadosEstruturadosSite(config){const url=config.origem+'/';return {'@context':'https://schema.org','@graph':[{'@type':'WebSite','@id':url+'#site',name:NOME_DO_SITE,url,inLanguage:'pt-BR',publisher:{'@id':url+'#org'}},{'@type':'Organization','@id':url+'#org',name:NOME_DO_SITE,url,logo:url+'favicon.svg'}]}}
// FAQPage só com as perguntas que a página mostra; sem perguntas, nada (FAQ escondida ou inventada é penalizada).
export function dadosEstruturadosFaq(perguntas,url){if(!Array.isArray(perguntas)||perguntas.length===0)return null;return {'@context':'https://schema.org','@type':'FAQPage','@id':url+'#faq',mainEntity:perguntas.map(p=>({'@type':'Question',name:p.pergunta,acceptedAnswer:{'@type':'Answer',text:p.resposta}}))}}
// JSON-LD dentro de <script>: "<" vira \u003c para nenhum texto fechar a tag; o JSON.parse continua lendo o mesmo objeto.
export function serializarSchema(v){return JSON.stringify(v).replace(/</g,'\\u003c')}
// Medição de visitas sem cookie (Cloudflare Web Analytics): o beacon só entra com um token bem formado; sem token,
// nada é medido e nenhum script de terceiro entra na página. O token identifica o site, não a pessoa.
export function tokenWebAnalytics(t){return typeof t==='string'&&/^[0-9a-f]{32}$/.test(t)?t:null}
export function beaconWebAnalytics(t){const token=tokenWebAnalytics(t);return token?{src:'https://static.cloudflareinsights.com/beacon.min.js',dados:JSON.stringify({token})}:null}
// Link de afiliado ("link patrocinado"): no máximo um por calculadora, só com o modo ativo, texto curto sem quebra de
// linha e URL https bem formada. Por quê: pela decisão do Tiago em 29/10/2026 o link entra só depois de o AdSense dizer
// "Pronto"; com o modo desligado (o que o repositório grava), nenhuma página mostra link nem aviso.
const TEXTO_CURTO=/^[^\r\n<>]{3,80}$/;
export function linkPatrocinado(parceiros,slug){
 if(!parceiros||parceiros.modo!=='ativo')return null;
 const l=parceiros.porCalculadora?.[slug];
 if(!l||typeof l.texto!=='string'||!TEXTO_CURTO.test(l.texto)||typeof l.programa!=='string'||!TEXTO_CURTO.test(l.programa))return null;
 try{const u=new URL(l.url);return u.protocol==='https:'?{texto:l.texto,programa:l.programa,url:u.href}:null}catch{return null}
}
// O que o Google exige num link pago (rel="sponsored") e o que protege quem clica (nova aba sem acesso à nossa janela).
export const ATRIBUTOS_DO_LINK_PATROCINADO={rel:'sponsored nofollow noopener',target:'_blank'};
