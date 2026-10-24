let cache:{em:number,dados:unknown}|undefined;
export async function GET(){
 try{
  if(cache&&Date.now()-cache.em<600000)return Response.json(cache.dados,{headers:{'Cache-Control':'public, max-age=300'}});
  const res=await fetch('https://tickerlab.com.br/dados/ferramentas.json',{signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw new Error('Fonte indisponível');
  const x=await res.json() as {gerado_em:string;ipca:{ultimo:string;meses:[string,number][]};moedas:{codigo:string;venda:number;compra:number;data:string;historico?:[string,number][]}[]};
  if(!x.gerado_em||!Array.isArray(x.ipca?.meses)||!Array.isArray(x.moedas))throw new Error('Dados incompletos');
  const meses=x.ipca.meses.filter(([d,n])=>/^\d{4}-\d{2}$/.test(d)&&Number.isFinite(n)&&n>-1).sort((a,b)=>a[0].localeCompare(b[0]));
  const moedas=x.moedas.filter(m=>['USD','EUR'].includes(m.codigo)&&Number.isFinite(m.venda)&&m.venda>0&&/^\d{4}-\d{2}-\d{2}$/.test(m.data)).map(m=>({codigo:m.codigo,venda:m.venda,data:m.data}));
  if(!meses.length||moedas.length!==2)throw new Error('Séries incompletas');
  const dados={gerado_em:x.gerado_em,ipca:{ultimo:meses.at(-1)![0],meses},moedas};cache={em:Date.now(),dados};
  return Response.json(dados,{headers:{'Cache-Control':'public, max-age=300'}});
 }catch{return Response.json({erro:'Não foi possível atualizar os índices agora. Tente novamente em instantes.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
