export function publicarHost(host,origem){return typeof host==='string'&&host.toLowerCase()===new URL(origem).host}
export function redirecionarDominio(url,origem){const atual=new URL(url),final=new URL(origem);if(atual.hostname!=='www.'+final.hostname)return null;return final.origin+atual.pathname+atual.search}
export function normalizarPublisher(id){if(typeof id!=='string')return null;const m=id.trim().match(/^(?:ca-)?pub-([0-9]{16})$/);return m&&!/^0+$/.test(m[1])?'ca-pub-'+m[1]:null}
export function textoAds(id){const p=normalizarPublisher(id);return p?`google.com, ${p.slice(3)}, DIRECT, f08c47fec0942fa0\n`:null}
export function anunciosProntos(c){return !!(c&&c.modo==='ativo'&&normalizarPublisher(c.publisherId)&&/^\d{10}$/.test(c.slotRodape))}
export function slotDe(c,posicao){const s=c?.slots?.[posicao];return typeof s==='string'&&/^\d{10}$/.test(s)?s:c?.slotRodape}
export function publicidadeRecusada(c,agora=Date.now()){return !!(c&&c.versao===1&&c.publicidade===false&&Number.isFinite(c.expira)&&c.expira>agora)}
export function contatoValido(email){return typeof email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!/[\r\n]/.test(email)}
export function caminhosPublicos(email){return ['/','/juros-compostos','/porcentagem','/a-vista-ou-parcelado','/quanto-guardar-por-mes','/correcao-ipca','/conversor-de-moedas','/sobre','/metodologia','/privacidade','/termos',...(contatoValido(email)?['/contato']:[])]}
export function textoRobots(host,config){return publicarHost(host,config.origem)?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /signin-with-chatgpt\nDisallow: /signout-with-chatgpt\nDisallow: /callback\nSitemap: ${config.origem}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n'}
export function xmlSitemap(config){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+caminhosPublicos(config.emailContato).map(p=>`<url><loc>${config.origem}${p}</loc><lastmod>${config.revisadoEm}</lastmod></url>`).join('')+'</urlset>'}
