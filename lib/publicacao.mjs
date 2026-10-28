export function publicarHost(host,origem){return typeof host==='string'&&host.toLowerCase()===new URL(origem).host}
export function redirecionarDominio(url,origem){const atual=new URL(url),final=new URL(origem);if(atual.hostname!=='www.'+final.hostname)return null;return final.origin+atual.pathname+atual.search}
export function normalizarPublisher(id){if(typeof id!=='string')return null;const m=id.trim().match(/^(?:ca-)?pub-([0-9]{16})$/);return m&&!/^0+$/.test(m[1])?'ca-pub-'+m[1]:null}
export function textoAds(id){const p=normalizarPublisher(id);return p?`google.com, ${p.slice(3)}, DIRECT, f08c47fec0942fa0\n`:null}
export function anunciosProntos(c){if(!c||c.modo!=='ativo'||!normalizarPublisher(c.publisherId)||!/^\d{10}$/.test(c.slotRodape)||c.cmpValidada!==true)return false;try{const u=new URL(c.cmpScriptUrl);return u.protocol==='https:'&&u.hostname==='fundingchoicesmessages.google.com'&&u.pathname==='/i/'+normalizarPublisher(c.publisherId).slice(3)}catch{return false}}
export function consentimentoValido(c,agora=Date.now()){return !!(c&&c.versao===1&&c.publicidade===true&&Number.isFinite(c.expira)&&c.expira>agora)}
export function aceitaTcf(c){if(!c||!['tcloaded','useractioncomplete'].includes(c.eventStatus))return false;if(c.gdprApplies===false)return true;return c.gdprApplies===true&&c.purpose?.consents?.[1]===true&&c.vendor?.consents?.[755]===true}
export function contatoValido(email){return typeof email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!/[\r\n]/.test(email)}
export function caminhosPublicos(email){return ['/','/juros-compostos','/porcentagem','/a-vista-ou-parcelado','/quanto-guardar-por-mes','/correcao-ipca','/conversor-de-moedas','/sobre','/metodologia','/privacidade','/termos',...(contatoValido(email)?['/contato']:[])]}
export function textoRobots(host,config){return publicarHost(host,config.origem)?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /signin-with-chatgpt\nDisallow: /signout-with-chatgpt\nDisallow: /callback\nSitemap: ${config.origem}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n'}
export function xmlSitemap(config){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+caminhosPublicos(config.emailContato).map(p=>`<url><loc>${config.origem}${p}</loc><lastmod>${config.revisadoEm}</lastmod></url>`).join('')+'</urlset>'}
// Medição de visitas sem cookie (Cloudflare Web Analytics): o beacon só entra com um token bem formado; sem token,
// nada é medido e nenhum script de terceiro entra na página. O token identifica o site, não a pessoa.
export function tokenWebAnalytics(t){return typeof t==='string'&&/^[0-9a-f]{32}$/.test(t)?t:null}
export function beaconWebAnalytics(t){const token=tokenWebAnalytics(t);return token?{src:'https://static.cloudflareinsights.com/beacon.min.js',dados:JSON.stringify({token})}:null}
