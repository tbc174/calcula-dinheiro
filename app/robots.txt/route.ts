import config from '../../config/publicacao.json';
import {textoRobots} from '../../lib/publicacao.mjs';
export function GET(request:Request){return new Response(textoRobots(new URL(request.url).host,config),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'}})}
