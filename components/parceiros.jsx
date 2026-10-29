import config from '../config/publicacao.json';
import {linkPatrocinado,ATRIBUTOS_DO_LINK_PATROCINADO} from '../lib/publicacao.mjs';
// Um lugar só por calculadora para um link de afiliado, sempre com o aviso "link patrocinado" e a explicação de que a
// comissão não muda o preço nem a conta. Sem link configurado e ativo, a página fica exatamente como era.
export function LinkPatrocinado({slug}){
 const l=linkPatrocinado(config.parceiros,slug);
 if(!l)return null;
 return <aside className="parceiro" aria-label="Link patrocinado">
  <small>Link patrocinado</small>
  <p><a href={l.url} {...ATRIBUTOS_DO_LINK_PATROCINADO}>{l.texto}</a> · programa de afiliados {l.programa}</p>
  <p className="small-note">Se você contratar por este link, o Calcula Dinheiro pode receber uma comissão do parceiro. Isso não muda o preço para você nem a conta desta página, e não é recomendação de investimento.</p>
 </aside>
}
