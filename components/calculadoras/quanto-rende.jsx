'use client';
// Tela da "quanto rende": poupança × CDB × LCI/LCA × Tesouro Selic pelo mesmo prazo, já líquidos de IOF, IR e custódia.
// A conta fica em lib/calculos/quanto-rende.ts; aqui só entradas, formatação e a leitura do resultado.
import {useState} from 'react';
import {lerNumero} from '../../lib/contas.mjs';
import {comparar,cdbQueEmpata,poupancaAoMes,diasDoPrazo,ISENTO_DE_CUSTODIA_ATE} from '../../lib/calculos/quanto-rende';
import {moeda,numero} from '../../lib/ferramentas';
import {Campo,Seletor,Entradas,Resultado,Aviso,calcular,Metodo,Barras} from '../comum';
const n=lerNumero;
const POR_CENTO=100;
const pct=(fracao,casas=2)=>numero(fracao*POR_CENTO,casas)+'%';

export default function QuantoRende(){
 const [valor,V]=useState('10.000'),[tempo,T]=useState('2'),[unidade,U]=useState('ano'),[cdi,C]=useState('14,65');
 const [cdb,B]=useState('100'),[lci,L]=useState('90'),[modoPoupanca,MP]=useState('regra'),[poupanca,P]=useState('0,5');
 const {r,erro}=calcular(()=>{
  const aplicado=n(valor),cdiAoAno=n(cdi)/POR_CENTO,dias=diasDoPrazo(n(tempo),unidade),percentualDaLci=n(lci)/POR_CENTO;
  const taxaDaPoupanca=modoPoupanca==='regra'?poupancaAoMes(cdiAoAno):n(poupanca)/POR_CENTO;
  const opcoes=comparar({valor:aplicado,dias,cdiPorAno:[cdiAoAno],percentualDoCdb:n(cdb)/POR_CENTO,percentualDaLci,poupancaAoMes:taxaDaPoupanca});
  const ordem=[...opcoes].sort((a,b)=>b.liquido-a.liquido);
  return {opcoes,melhor:ordem[0],segunda:ordem[1],dias,aplicado,taxaDaPoupanca,percentualDaLci,empate:cdbQueEmpata(aplicado,dias,[cdiAoAno],percentualDaLci)};
 });
 return <div className="calculator-grid">
  <Entradas>
   <Campo label="Quanto vai aplicar?" prefix="R$" value={valor} onChange={V}/>
   <div className="field-row"><Campo label="Por quanto tempo?" value={tempo} onChange={T}/><Seletor label="Unidade do prazo" value={unidade} onChange={U} items={[["ano","Anos"],["mes","Meses"],["dia","Dias"]]}/></div>
   <Campo label="CDI ao ano (%)" value={cdi} onChange={C} hint="A taxa DI de referência; a de hoje está no site da B3. O Tesouro Selic usa 100% dela."/>
   <div className="field-row"><Campo label="CDB (% do CDI)" value={cdb} onChange={B}/><Campo label="LCI ou LCA (% do CDI)" value={lci} onChange={L}/></div>
   <Seletor label="Rendimento da poupança" value={modoPoupanca} onChange={MP} items={[["regra","Pela regra oficial (usa o CDI como Selic)"],["manual","Digitar a taxa ao mês"]]}/>
   {modoPoupanca==='manual'?<Campo label="Poupança ao mês (%)" value={poupanca} onChange={P}/>:<p className="small-note">Regra da poupança: 0,5% ao mês quando a Selic passa de 8,5% ao ano; abaixo disso, 70% da Selic. Sem a TR.</p>}
   <p className="small-note">Simulação com a taxa que você digitou; não é previsão nem recomendação.</p>
  </Entradas>
  <div className="results">{erro?<Aviso error={erro}/>:<>
   <Resumo r={r} lci={lci}/>
   <section className="panel chart-panel"><div className="chart-head"><div><h2>Rendimento líquido de cada opção</h2><p>O que sobra depois de IOF, imposto de renda e custódia, em {r.dias} dias corridos.</p></div></div>
    <Barras items={r.opcoes.map(o=>({label:o.nome,valor:Math.max(o.liquido-r.aplicado,0),texto:moeda(o.liquido-r.aplicado)}))}/>
   </section>
   <TabelaOpcoes r={r}/>
   <Metodo>
    <p>CDB, LCI/LCA e Tesouro Selic rendem sobre a taxa de cada dia útil: taxa diária = (1 + CDI)^(1/252) − 1, multiplicada pelo percentual do CDI; os dias corridos viram dias úteis pela proporção 252/365. A poupança rende só no aniversário, a cada 30 dias.</p>
    <p>Imposto de renda pela tabela regressiva (Lei 11.033/2004): 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720 e 15% acima disso, sobre o rendimento. IOF nos primeiros 29 dias (Decreto 6.306/2007, art. 32): 96% do rendimento no 1º dia, caindo até 3% no 29º; zero a partir do 30º. O IR incide sobre o que sobra depois do IOF. LCI, LCA e poupança são isentas para pessoa física.</p>
    <p>Custódia da B3 no Tesouro Direto: 0,2% ao ano sobre o saldo médio, isenta até {moeda(ISENTO_DE_CUSTODIA_ATE)} no Tesouro Selic. Ficam de fora: a TR da poupança, feriados, carência de cada título, risco do emissor, FGC e marcação a mercado.</p>
   </Metodo>
  </>}</div>
 </div>
}

function Resumo({r,lci}){
 const {melhor,segunda,aplicado,empate,dias}=r;
 const poupanca=r.opcoes.find(o=>o.nome==='Poupança'),cdb=r.opcoes.find(o=>o.nome==='CDB');
 const diferenca=melhor.liquido-segunda.liquido;
 return <Resultado label={`Rende mais, já líquido: ${melhor.nome}`} valor={moeda(melhor.liquido)} metrics={[['Rendimento líquido',moeda(melhor.liquido-aplicado),'green'],['Poupança no mesmo prazo',moeda(poupanca.liquido),'blue']]}>
  <p>{moeda(aplicado)} por {dias} dias corridos. {diferenca>0.005?`A segunda opção, ${segunda.nome}, fica ${moeda(diferenca)} atrás.`:`${segunda.nome} rende o mesmo.`} {empate==null?'Neste prazo, nenhum CDB até 1.000% do CDI empata com a LCI.':`Um CDB precisa pagar ${pct(empate)} do CDI para empatar com a LCI a ${lci}% do CDI, porque paga ${pct(cdb.aliquota,1)} de imposto.`}</p>
 </Resultado>
}

function TabelaOpcoes({r}){
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>Bruto, descontos e líquido</h2><p>A mesma aplicação, opção por opção.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Opção</th><th>Bruto</th><th>IOF</th><th>Imposto de renda</th><th>Custódia</th><th>Líquido</th></tr></thead><tbody>
   {r.opcoes.map(o=><tr key={o.nome}><td>{o.nome}</td><td>{moeda(o.bruto)}</td><td>{o.isento?'isenta':o.iof>0.005?moeda(o.iof):'—'}</td><td>{o.isento?'isenta':`${moeda(o.imposto)} (${pct(o.aliquota,1)})`}</td><td>{o.custodia>0.005?moeda(o.custodia):'—'}</td><td><strong>{moeda(o.liquido)}</strong></td></tr>)}
  </tbody></table></div>
  {r.aplicado<=ISENTO_DE_CUSTODIA_ATE&&<p className="small-note">Até {moeda(ISENTO_DE_CUSTODIA_ATE)}, o Tesouro Selic não paga custódia: por isso ele rende o mesmo que um CDB a 100% do CDI.</p>}
 </section>
}
