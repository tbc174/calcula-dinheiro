import {notFound} from 'next/navigation';
import {ferramentas} from '../../lib/ferramentas';
import {ToolLayout} from '../../components/estrutura';
import Calculadora from '../../components/calculadora';
import {metadataPagina,dadosEstruturados,dadosEstruturadosPerguntas,serializarSchema} from '../../lib/seo';
import {conteudos} from '../../lib/conteudo';
import {GuiaFerramenta} from '../../components/guia';
import {EspacoPublicidade} from '../../components/publicidade';
export function generateStaticParams(){return ferramentas.map(f=>({ferramenta:f.slug}))}
export async function generateMetadata({params}:{params:Promise<{ferramenta:string}>}){const p=await params;const t=ferramentas.find(f=>f.slug===p.ferramenta);if(!t)return {title:'Página não encontrada',robots:{index:false,follow:false}};const c=conteudos[t.slug];return metadataPagina(c.titulo,c.descricaoSEO??t.descricao,'/'+t.slug)}
export default async function Page({params}:{params:Promise<{ferramenta:string}>}){const p=await params;const t=ferramentas.find(f=>f.slug===p.ferramenta);if(!t)notFound();const c=conteudos[t.slug];const faq=dadosEstruturadosPerguntas(c.perguntas,'/'+t.slug);return <ToolLayout tool={t}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializarSchema(dadosEstruturados(c.titulo,c.descricaoSEO??t.descricao,'/'+t.slug,true))}}/>{faq&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializarSchema(faq)}}/>}<Calculadora slug={t.slug}/><GuiaFerramenta conteudo={c}/><EspacoPublicidade/></ToolLayout>}
