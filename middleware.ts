import {NextRequest,NextResponse} from 'next/server';
import publicacao from './config/publicacao.json';
import {redirecionarDominio} from './lib/publicacao.mjs';

export function middleware(request:NextRequest){
  const destino=redirecionarDominio(request.url,publicacao.origem);
  return destino?NextResponse.redirect(destino,308):NextResponse.next();
}
