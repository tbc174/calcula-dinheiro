import config from '../../config/publicacao.json';
import {xmlSitemap} from '../../lib/publicacao.mjs';
export function GET(){return new Response(xmlSitemap(config),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}})}
