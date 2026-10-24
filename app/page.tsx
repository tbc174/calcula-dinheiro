import Inicio from '../components/inicio';
import {metadataPagina,dadosEstruturados,serializarSchema} from '../lib/seo';
const titulo='Calculadoras financeiras para o dia a dia';
const descricao='Simule juros compostos, descontos, parcelas, metas de economia, inflação e moedas com gráficos e explicações simples.';
export function generateMetadata(){return metadataPagina(titulo,descricao,'/')}
export default function Page(){return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializarSchema(dadosEstruturados(titulo,descricao,'/'))}}/><Inicio/></>}
