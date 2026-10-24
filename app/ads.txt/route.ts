import config from '../../config/publicacao.json';
import {textoAds} from '../../lib/publicacao.mjs';
export function GET(){const texto=textoAds(config.adsense.publisherId);return new Response(texto||'Nenhum vendedor de publicidade configurado.\n',{status:texto?200:404,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300','X-Robots-Tag':'noindex'}})}
