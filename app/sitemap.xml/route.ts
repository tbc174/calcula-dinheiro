import config from '../../config/publicacao.json';
import {xmlSitemap,revisoesPorCaminho} from '../../lib/publicacao.mjs';
import {conteudos} from '../../lib/conteudo';
export function GET(){return new Response(xmlSitemap(config,revisoesPorCaminho(conteudos)),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}})}
