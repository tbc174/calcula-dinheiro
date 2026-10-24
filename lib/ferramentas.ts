export const ferramentas = [
 {slug:'juros-compostos',titulo:'Juros compostos',chamada:'Cada valor faz diferença.',descricao:'Veja quanto você pode acumular e de onde vem cada parte do saldo.',categoria:'Guardar e planejar',icone:'juros'},
 {slug:'porcentagem',titulo:'Porcentagem',chamada:'A conta fica mais clara.',descricao:'Calcule descontos, aumentos, proporções e variações sem complicação.',categoria:'Comprar e comparar',icone:'porcentagem'},
 {slug:'a-vista-ou-parcelado',titulo:'À vista ou parcelado',chamada:'Compare antes de escolher.',descricao:'Descubra o total de cada opção, incluindo entrada e parcelas.',categoria:'Comprar e comparar',icone:'parcelas'},
 {slug:'quanto-guardar-por-mes',titulo:'Quanto guardar por mês',chamada:'Dê um plano à sua meta.',descricao:'Descubra quanto separar por mês para chegar ao valor que você quer.',categoria:'Guardar e planejar',icone:'meta'},
 {slug:'correcao-ipca',titulo:'Correção pelo IPCA',chamada:'O tempo muda os preços.',descricao:'Atualize um valor pela inflação e entenda o efeito sobre seu poder de compra.',categoria:'Entender os valores',icone:'inflacao'},
 {slug:'conversor-de-moedas',titulo:'Conversor de moedas',chamada:'Um valor, outra moeda.',descricao:'Converta real, dólar e euro com cotação de referência e data à vista.',categoria:'Entender os valores',icone:'moedas'},
] as const;
export type Slug = typeof ferramentas[number]['slug'];
export const moeda=(n:number,codigo='BRL')=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:codigo,maximumFractionDigits:2}).format(n);
export const numero=(n:number,d=2)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
export const percentual=(n:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n)+'%';
export const dataBr=(s:string)=>s.slice(0,10).split('-').reverse().join('/');
export const mesBr=(s:string)=>new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(s+'-15T12:00:00Z'));
export const prazo=(n:number)=>n%12===0?`${n/12} ${n===12?'ano':'anos'}`:`${n} ${n===1?'mês':'meses'}`;
