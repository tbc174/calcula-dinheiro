'use client';
// Tela do empréstimo: parcela (Price), juros total e CET, com IOF e tarifa, financiados ou descontados do valor liberado.
// A conta fica em lib/calculos/emprestimo.ts; aqui só entradas, formatação, a leitura do resultado, a comparação de
// prazos, a tabela mês a mês e o aviso de vigência da tabela do IOF.
import {useState} from 'react';
import {lerNumero,taxaMensal} from '../../lib/contas.mjs';
import {simularEmprestimo,compararPrazos,IOF_PESSOA_FISICA} from '../../lib/calculos/emprestimo';
import {estadoDaTabela} from '../../lib/calculos/salario-liquido';
import {moeda,numero,dataBr,prazo} from '../../lib/ferramentas';
import {Campo,Seletor,Entradas,Resultado,Aviso,calcular,Metodo,Barras} from '../comum';
const n=lerNumero;
const POR_CENTO=100;
const pct=(fracao,casas=2)=>numero(fracao*POR_CENTO,casas)+'%';

export default function Emprestimo(){
 const [valor,V]=useState('5.000'),[taxa,T]=useState('3'),[unidade,U]=useState('mes'),[meses,M]=useState('12');
 const [tarifa,TA]=useState('0'),[iof,I]=useState('sim'),[custos,C]=useState('financiados');
 const {r,erro}=calcular(()=>{
  const entrada={valor:n(valor),taxa:taxaMensal(n(taxa),unidade),meses:n(meses),tarifa:n(tarifa),iof:iof==='sim',custos};
  return {...simularEmprestimo(entrada),prazos:compararPrazos(entrada),taxaMensal:entrada.taxa};
 });
 const trocarUnidade=v=>{try{const t=n(taxa)/POR_CENTO;T(((v==='ano'?Math.pow(1+t,12)-1:Math.pow(1+t,1/12)-1)*POR_CENTO).toLocaleString('pt-BR',{maximumFractionDigits:12,useGrouping:false}))}catch{}U(v)};
 return <div className="calculator-grid">
  <Entradas>
   <Campo label="Quanto você quer receber" prefix="R$" value={valor} onChange={V} hint="O valor que vai cair na conta (ou a dívida, se os custos forem descontados dele)."/>
   <div className="field-row"><Campo label="Taxa de juros (%)" value={taxa} onChange={T}/><Seletor label="Período da taxa" value={unidade} onChange={trocarUnidade} items={[["mes","Ao mês"],["ano","Ao ano"]]}/></div>
   <Campo label="Prazo (meses)" value={meses} onChange={M} hint="O número de parcelas. Abaixo você vê o mesmo empréstimo em outros prazos."/>
   <Campo label="Tarifa de cadastro ou abertura (opcional)" prefix="R$" value={tarifa} onChange={TA} hint="Valor fixo cobrado uma vez. Está no contrato, perto do CET."/>
   <Seletor label="IOF" value={iof} onChange={I} items={[["sim","Cobrar IOF da pessoa física"],["nao","Sem IOF"]]}/>
   <Seletor label="Tarifa e IOF" value={custos} onChange={C} items={[["financiados","Entram na dívida (você recebe o valor inteiro)"],["descontados","Saem do valor liberado (você recebe menos)"]]}/>
   <p className="small-note">Simulação com os valores que você digitou; não é previsão nem recomendação, nem uma oferta de crédito.</p>
  </Entradas>
  <div className="results">
   <AvisoDeVigencia/>
   {erro?<Aviso error={erro}/>:<>
   <Resumo r={r}/>
   <section className="panel chart-panel"><div className="chart-head"><div><h2>Para onde vai o que você paga</h2><p>Das {r.meses} parcelas, o que volta como dinheiro na mão e o que é custo.</p></div></div>
    <Barras items={[{label:'Dinheiro que você recebe',valor:r.valorRecebido,texto:moeda(r.valorRecebido)},{label:'Juros',valor:r.totalJuros,texto:moeda(r.totalJuros)},...(r.iof>0?[{label:'IOF',valor:r.iof,texto:moeda(r.iof)}]:[]),...(r.tarifa>0?[{label:'Tarifa',valor:r.tarifa,texto:moeda(r.tarifa)}]:[])]}/>
    <div className="formula">{r.meses} × {moeda(r.parcela)} = <strong>{moeda(r.totalPago)}</strong> pagos por <strong>{moeda(r.valorRecebido)}</strong> recebidos: custo total de <strong>{moeda(r.custoTotal)}</strong></div>
   </section>
   <OutrosPrazos r={r}/>
   <MesAMes r={r}/>
   <Metodo>
    <p>Parcela pela tabela Price: a mesma todo mês; dentro dela, os juros são a taxa ao mês sobre o saldo e o resto amortiza a dívida. Taxa ao ano vira taxa ao mês pela equivalência composta: (1 + taxa anual)^(1/12) − 1.</p>
    <p>IOF da pessoa física (Decreto nº 6.306/2007, art. 7º): {pct(IOF_PESSOA_FISICA.aliquotaFixa)} sobre o valor mais {numero(IOF_PESSOA_FISICA.aliquotaDiaria*POR_CENTO,4)}% por dia sobre cada parcela do principal, limitado a {IOF_PESSOA_FISICA.diasMaximos} dias (no máximo {pct(IOF_PESSOA_FISICA.aliquotaFixa+IOF_PESSOA_FISICA.aliquotaDiaria*IOF_PESSOA_FISICA.diasMaximos,3)} sobre o que vence depois de um ano). Aqui cada mês tem 30 dias; o banco conta os dias do calendário, então os centavos podem diferir.</p>
    <p>CET (Resolução CMN nº 4.881/2020): a taxa que iguala o que você recebeu ao valor presente das parcelas. Como o IOF e a tarifa saem do seu bolso sem virar dinheiro na mão, o CET fica acima da taxa de juros sempre que há algum deles; sem custos, CET e taxa coincidem. Custos financiados: a dívida é o valor recebido mais a tarifa e o IOF (que incide sobre o total, inclusive sobre si mesmo). Custos descontados: a dívida é o valor digitado e você recebe menos.</p>
    <p>Ficam de fora seguros, tarifa embutida na taxa, multa e juros de atraso, as regras do consignado e a antecipação de parcelas. Alíquotas do IOF conferidas até {dataBr(IOF_PESSOA_FISICA.vigenteAte)}.</p>
   </Metodo>
  </>}</div>
 </div>
}

// Risco 4 do plano: a tabela do IOF tem data de conferência; perto do fim ou depois dele, a tela avisa (e um teste falha depois do fim).
function AvisoDeVigencia(){
 const estado=estadoDaTabela(new Date(),IOF_PESSOA_FISICA);
 if(estado==='vigente')return null;
 const fim=dataBr(IOF_PESSOA_FISICA.vigenteAte);
 return <div className="alert" role="status" style={{marginBottom:20}}>
  <strong>{estado==='fora-da-vigencia'?'Alíquotas do IOF conferidas até '+fim:'As alíquotas do IOF foram conferidas até '+fim}</strong>
  <p style={{margin:'8px 0 0'}}>{estado==='fora-da-vigencia'?'O IOF do crédito muda por decreto. Se o governo alterou as alíquotas depois dessa data, o IOF e o CET aqui estão defasados: confira o CET no contrato.':'O IOF do crédito muda por decreto. Antes de usar o resultado para o ano seguinte, confira se as alíquotas continuam as mesmas.'}</p>
 </div>
}

function Resumo({r}){
 const semCustos=r.iof===0&&r.tarifa===0;
 return <Resultado label={`Parcela por ${prazo(r.meses)}`} valor={moeda(r.parcela)} metrics={[['CET ao ano',pct(r.cetAnual),'orange'],['Juros no total',moeda(r.totalJuros),'blue']]}>
  <p>Você recebe {moeda(r.valorRecebido)} e devolve {moeda(r.totalPago)}: {moeda(r.custoTotal)} a mais, {pct(r.custoTotal/r.valorRecebido,1)} do que recebeu. {semCustos?`Sem IOF nem tarifa, o CET é a própria taxa: ${pct(r.cetMensal)} ao mês, ${pct(r.cetAnual)} ao ano.`:`A taxa de juros é ${pct(r.taxaMensal)} ao mês (${pct(r.taxaAnual)} ao ano), mas o CET, que inclui ${r.iof>0&&r.tarifa>0?'o IOF e a tarifa':r.iof>0?'o IOF':'a tarifa'}, é ${pct(r.cetMensal)} ao mês, ${pct(r.cetAnual)} ao ano. É o CET que se compara entre propostas.`}</p>
 </Resultado>
}

function OutrosPrazos({r}){
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>O mesmo empréstimo em outros prazos</h2><p>Prazo maior: parcela menor, custo total maior.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Prazo</th><th>Parcela</th><th>Custo total</th><th>CET ao ano</th></tr></thead><tbody>
   {r.prazos.map(p=><tr key={p.meses} style={p.meses===r.meses?{fontWeight:600}:undefined}><td>{p.meses}×{p.meses===r.meses?' (o seu)':''}</td><td>{moeda(p.parcela)}</td><td>{moeda(p.custoTotal)}</td><td>{pct(p.cetAnual)}</td></tr>)}
  </tbody></table></div>
  <div className="explain">O custo total sobe com o prazo porque os juros correm por mais tempo sobre um saldo que cai devagar. Escolha a parcela que cabe no mês sem esquecer o que o prazo custa.</div>
 </section>
}

function MesAMes({r}){
 return <details style={{marginTop:12}}><summary>Ver as parcelas mês a mês</summary><div className="table-wrap"><table><thead><tr><th>Mês</th><th>Parcela</th><th>Juros</th><th>Amortização</th><th>Saldo devedor</th></tr></thead><tbody>
  {r.linhas.map(l=><tr key={l.mes}><td>{l.mes}</td><td>{moeda(l.parcela)}</td><td>{moeda(l.juros)}</td><td>{moeda(l.amortizacao)}</td><td>{moeda(l.saldo)}</td></tr>)}
 </tbody></table></div></details>
}
