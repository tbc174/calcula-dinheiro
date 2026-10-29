'use client';
// Tela do simulador de financiamento: SAC × Price lado a lado, parcela a parcela, com amortização extra opcional.
// A conta fica em lib/calculos/financiamento.ts; aqui só entradas, formatação e o gráfico das parcelas.
import {useEffect,useRef,useState} from 'react';
import {lerNumero,taxaMensal} from '../../lib/contas.mjs';
import {compararSistemas} from '../../lib/calculos/financiamento';
import {moeda,numero,prazo} from '../../lib/ferramentas';
import {Campo,Seletor,Entradas,Resultado,Aviso,calcular,Metodo} from '../comum';
const n=lerNumero;
const COR={sac:'var(--blue)',price:'var(--green)'};
const NOME={sac:'SAC',price:'Price'};

export default function Financiamento(){
 const [valor,V]=useState('300.000'),[taxa,T]=useState('10,5'),[unidade,U]=useState('ano'),[tempo,P]=useState('30'),[unidadeTempo,UT]=useState('ano');
 const [extraModo,EM]=useState('nenhuma'),[extraMes,EMes]=useState('12'),[extraValor,EV]=useState('20.000'),[sistemaTabela,ST]=useState('sac');
 const {r,erro}=calcular(()=>{
  const meses=n(tempo)*(unidadeTempo==='ano'?12:1);
  const base={valor:n(valor),taxa:taxaMensal(n(taxa),unidade),meses};
  const temExtra=extraModo!=='nenhuma';
  const entrada=temExtra?{...base,extraMes:n(extraMes),extraValor:n(extraValor),extraModo}:base;
  return {...compararSistemas(entrada),sem:temExtra?compararSistemas(base):null,taxaMensal:base.taxa,meses,temExtra};
 });
 const trocarUnidade=v=>{try{const t=n(taxa)/100;T(((v==='ano'?Math.pow(1+t,12)-1:Math.pow(1+t,1/12)-1)*100).toLocaleString('pt-BR',{maximumFractionDigits:12,useGrouping:false}))}catch{}U(v)};
 const trocarPrazo=v=>{try{P((n(tempo)*(v==='mes'?12:1/12)).toLocaleString('pt-BR',{maximumFractionDigits:12,useGrouping:false}))}catch{}UT(v)};
 return <div className="calculator-grid">
  <Entradas>
   <Campo label="Valor financiado" prefix="R$" value={valor} onChange={V} hint="O que falta pagar depois da entrada."/>
   <div className="field-row"><Campo label="Taxa de juros (%)" value={taxa} onChange={T}/><Seletor label="Período da taxa" value={unidade} onChange={trocarUnidade} items={[["ano","Ao ano"],["mes","Ao mês"]]}/></div>
   <div className="field-row"><Campo label="Prazo" value={tempo} onChange={P}/><Seletor label="Unidade do prazo" value={unidadeTempo} onChange={trocarPrazo} items={[["ano","Anos"],["mes","Meses"]]}/></div>
   <Seletor label="Amortização extra" value={extraModo} onChange={EM} items={[["nenhuma","Sem amortização extra"],["prazo","Pagar a mais e reduzir o prazo"],["parcela","Pagar a mais e reduzir a parcela"]]}/>
   {extraModo!=='nenhuma'&&<div className="field-row"><Campo label="Em que mês?" value={extraMes} onChange={EMes}/><Campo label="Quanto a mais?" prefix="R$" value={extraValor} onChange={EV}/></div>}
   <p className="small-note">Simulação com a taxa que você digitou; não é previsão nem recomendação, nem uma oferta de crédito.</p>
  </Entradas>
  <div className="results">{erro?<Aviso error={erro}/>:<>
   <Resumo r={r}/>
   <LadoALado r={r}/>
   <GraficoParcelas sac={r.sac.linhas} price={r.price.linhas}/>
   <section className="panel chart-panel"><div className="chart-head"><div><h2>Mês a mês</h2><p>Juros, amortização e saldo de cada parcela.</p></div><div className="segments" aria-label="Sistema da tabela">{['sac','price'].map(s=><button key={s} aria-pressed={sistemaTabela===s} onClick={()=>ST(s)}>{NOME[s]}</button>)}</div></div><TabelaParcelas linhas={r[sistemaTabela].linhas} temExtra={r.temExtra}/></section>
   <Metodo>
    <p>Juros do mês = saldo devedor × taxa mensal. No SAC, a amortização é fixa (valor ÷ prazo) e a parcela é amortização + juros, por isso cai todo mês. Na Price, a parcela é fixa: valor × taxa ÷ (1 − (1 + taxa)^−prazo); a amortização é o que sobra da parcela depois dos juros.</p>
    <p>Taxa anual convertida pela equivalência composta: (1 + taxa anual)^(1/12) − 1. A amortização extra abate o saldo no mês escolhido; para reduzir o prazo, parcela (Price) ou amortização (SAC) continuam iguais e o contrato termina antes; para reduzir a parcela, a conta é refeita para os meses que faltam.</p>
    <p>Taxa constante, sem seguros (MIP e DFI), taxa de administração, IOF nem correção do saldo pela TR ou pelo IPCA: o valor da parcela no contrato pode ser maior. Prazo máximo de 600 meses.</p>
   </Metodo>
  </>}</div>
 </div>
}

function Resumo({r}){
 const dif=r.price.totalJuros-r.sac.totalJuros,inicio=r.sac.primeiraParcela-r.price.primeiraParcela;
 return <Resultado label={dif>0.005?'Em juros, a Price custa a mais':dif<-0.005?'Em juros, o SAC custa a mais':'Os dois sistemas custam o mesmo'} valor={moeda(Math.abs(dif))} metrics={[['Primeira parcela no SAC',moeda(r.sac.primeiraParcela),'blue'],['Parcela na Price',moeda(r.price.primeiraParcela),'green']]}>
  <p>{inicio>0.005?`A primeira parcela do SAC é ${moeda(inicio)} maior que a da Price; em troca, ela cai todo mês e o total de juros é menor.`:'Com juro zero, parcela e total são iguais nos dois sistemas.'} Taxa usada: {numero(r.taxaMensal*100,4)}% ao mês.</p>
 </Resultado>
}

function LadoALado({r}){
 const linhas=[['Primeira parcela',x=>moeda(x.primeiraParcela)],['Última parcela',x=>moeda(x.ultimaParcela)],['Total de juros',x=>moeda(x.totalJuros)],['Total pago',x=>moeda(x.totalPago)],['Prazo',x=>prazo(x.meses)]];
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>Os dois sistemas, lado a lado</h2><p>Mesmo valor, mesma taxa e mesmo prazo.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th></th><th>SAC</th><th>Price</th></tr></thead><tbody>{linhas.map(([rotulo,f])=><tr key={rotulo}><td>{rotulo}</td><td>{f(r.sac)}</td><td>{f(r.price)}</td></tr>)}</tbody></table></div>
  {r.temExtra&&<div className="explain"><strong>Efeito da amortização extra ({moeda(r.sac.totalExtra)}):</strong><p>{['sac','price'].map(s=>{const com=r[s],sem=r.sem[s];return `${NOME[s]}: ${com.meses<sem.meses?`termina ${prazo(sem.meses-com.meses)} antes`:'mantém o prazo'} e paga ${moeda(sem.totalJuros-com.totalJuros)} a menos de juros`}).join('. ')}.</p></div>}
 </section>
}

function GraficoParcelas({sac,price}){
 const N=Math.max(sac.length,price.length);
 const [pos,setPos]=useState(null);const i=Math.min(pos??N-1,N-1);
 const ref=useRef(null);const[W,setW]=useState(660);useEffect(()=>{const el=ref.current;if(!el)return;const obs=new ResizeObserver(e=>setW(Math.max(200,Math.round(e[0].contentRect.width))));obs.observe(el);return()=>obs.disconnect()},[]);
 const H=250,L=68,R=16,T=18,B=36;const max=Math.max(...sac.map(l=>l.parcela),...price.map(l=>l.parcela),1)*1.12;
 const x=k=>L+k/(N-1||1)*(W-L-R),y=v=>H-B-v/max*(H-T-B);
 const caminho=arr=>arr.map((l,k)=>(k?'L':'M')+x(k).toFixed(2)+','+y(l.parcela).toFixed(2)).join(' ');
 const eixo=v=>v>=1e6?'R$ '+numero(v/1e6,1)+' mi':v>=1000?'R$ '+numero(v/1000,0)+' mil':'R$ '+numero(v,0);
 const ponto=(arr,s)=>arr[i]?<circle cx={x(i)} cy={y(arr[i].parcela)} r="5" fill={COR[s]} stroke="var(--card)" strokeWidth="2"/>:null;
 const texto=(arr,s)=>arr[i]?`${NOME[s]}: parcela de ${moeda(arr[i].parcela)}, saldo de ${moeda(arr[i].saldo)}`:`${NOME[s]}: já quitado`;
 const ticks=[...new Set([0,Math.round((N-1)/2),N-1])];
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>A parcela, mês a mês</h2><p>No SAC ela cai; na Price fica igual até o fim.</p></div></div>
  <div className="chart-wrap" ref={ref}><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Parcela mês a mês. SAC começa em ${moeda(sac[0].parcela)} e termina em ${moeda(sac.at(-1).parcela)}; Price fica em ${moeda(price[0].parcela)}. Explore os valores pelo controle abaixo.`}>
   {[0,.25,.5,.75,1].map(t=><g key={t}><line x1={L} y1={y(max*t)} x2={W-R} y2={y(max*t)} stroke="var(--line)" strokeDasharray={t?'3 4':undefined}/><text x={L-9} y={y(max*t)+4} textAnchor="end">{eixo(max*t)}</text></g>)}
   <path d={caminho(sac)} fill="none" stroke={COR.sac} strokeWidth="3"/><path d={caminho(price)} fill="none" stroke={COR.price} strokeWidth="3"/>
   <line x1={x(i)} x2={x(i)} y1={T} y2={H-B} stroke="var(--muted)" opacity=".5" strokeDasharray="3 3"/>{ponto(sac,'sac')}{ponto(price,'price')}
   {ticks.map(k=><text key={k} x={x(k)} y={H-9} textAnchor={k===0?'start':k===N-1?'end':'middle'}>Mês {k+1}</text>)}
  </svg></div>
  <div className="legend"><span><i style={{background:COR.sac}}/>SAC</span><span><i style={{background:COR.price}}/>Price</span></div>
  <div className="explore"><div className="explore-head"><label htmlFor="explorar-financiamento">Explore cada mês</label><strong>Mês {i+1}</strong></div><input id="explorar-financiamento" type="range" min="0" max={N-1} step="1" value={i} onChange={e=>setPos(Number(e.target.value))} aria-valuetext={`Mês ${i+1}. ${texto(sac,'sac')}. ${texto(price,'price')}`}/><div className="explain"><strong>{texto(sac,'sac')}</strong><br/>{texto(price,'price')}</div></div>
 </section>
}

function TabelaParcelas({linhas,temExtra}){
 return <details style={{marginTop:12}}><summary>Ver as {linhas.length} parcelas</summary><div className="table-wrap"><table><thead><tr><th>Mês</th><th>Parcela</th><th>Juros</th><th>Amortização</th>{temExtra&&<th>Extra</th>}<th>Saldo</th></tr></thead><tbody>{linhas.map(l=><tr key={l.mes}><td>{l.mes}</td><td>{moeda(l.parcela)}</td><td>{moeda(l.juros)}</td><td>{moeda(l.amortizacao)}</td>{temExtra&&<td>{l.extra?moeda(l.extra):'—'}</td>}<td>{moeda(l.saldo)}</td></tr>)}</tbody></table></div></details>
}
