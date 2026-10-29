'use client';
// Tela do rotativo do cartão: um mês de rotativo, o parcelamento da fatura com o teto de 100% da Lei 14.690/2023 e a
// comparação com um empréstimo pessoal. A conta fica em lib/calculos/rotativo.ts; aqui só entradas, formatação, a leitura
// do resultado, as barras dos três caminhos, a tabela mês a mês e o aviso de vigência das taxas de referência.
import {useState} from 'react';
import {lerNumero} from '../../lib/contas.mjs';
import {simularRotativo,taxaMensalDaAnual,TAXAS_DE_REFERENCIA,TETO_DOS_JUROS,DIAS_DO_ROTATIVO,PARCELAS_MAXIMAS} from '../../lib/calculos/rotativo';
import {IOF_PESSOA_FISICA} from '../../lib/calculos/emprestimo';
import {estadoDaTabela} from '../../lib/calculos/salario-liquido';
import {moeda,numero,dataBr} from '../../lib/ferramentas';
import {Campo,Entradas,Resultado,Aviso,calcular,Metodo,Barras} from '../comum';
const n=lerNumero;
const POR_CENTO=100;
const pct=(fracao,casas=2)=>numero(fracao*POR_CENTO,casas)+'%';
// As taxas sugeridas saem da tabela de referência, arredondadas a uma casa, para a tela nunca divergir dela.
const sugerida=aoAno=>numero(taxaMensalDaAnual(aoAno)*POR_CENTO,1);

export default function Rotativo(){
 const [fatura,F]=useState('2.000'),[pagamento,P]=useState('300'),[parcelas,N]=useState('12');
 const [taxaRotativo,TR]=useState(sugerida(TAXAS_DE_REFERENCIA.rotativoAoAno));
 const [taxaParcelamento,TP]=useState(sugerida(TAXAS_DE_REFERENCIA.parcelamentoAoAno));
 const [taxaEmprestimo,TE]=useState(sugerida(TAXAS_DE_REFERENCIA.emprestimoAoAno));
 const {r,erro}=calcular(()=>simularRotativo({fatura:n(fatura),pagamento:n(pagamento),taxaDoRotativo:n(taxaRotativo)/POR_CENTO,taxaDoParcelamento:n(taxaParcelamento)/POR_CENTO,parcelas:n(parcelas),taxaDoEmprestimo:n(taxaEmprestimo)/POR_CENTO}));
 return <div className="calculator-grid">
  <Entradas>
   <Campo label="Valor total da fatura" prefix="R$" value={fatura} onChange={F}/>
   <Campo label="Quanto você vai pagar no vencimento" prefix="R$" value={pagamento} onChange={P} hint="O pagamento mínimo da fatura ou o que você consegue pagar. O que faltar entra no rotativo."/>
   <Campo label="Taxa do rotativo (% ao mês)" value={taxaRotativo} onChange={TR} hint="Está na fatura, em 'juros do crédito rotativo'. A sugestão é a média do Banco Central."/>
   <div className="field-row"><Campo label="Taxa do parcelamento (% ao mês)" value={taxaParcelamento} onChange={TP} hint="A taxa que o banco oferece para parcelar o saldo; tem de ser menor que a do rotativo."/><Campo label="Parcelas" value={parcelas} onChange={N} hint={`De 1 a ${PARCELAS_MAXIMAS}.`}/></div>
   <Campo label="Taxa de um empréstimo pessoal (% ao mês)" value={taxaEmprestimo} onChange={TE} hint="Para comparar: pegar o valor emprestado e quitar a fatura. Detalhes do empréstimo na calculadora de empréstimo."/>
   <p className="small-note">Simulação com os valores que você digitou; não é previsão nem recomendação, nem uma oferta de crédito.</p>
  </Entradas>
  <div className="results">
   <AvisoDeVigencia/>
   {erro?<Aviso error={erro}/>:<>
   <Resumo r={r}/>
   <TresCaminhos r={r} parcelas={n(parcelas)}/>
   <PassoAPasso r={r}/>
   <MesAMes r={r}/>
   <Metodo>
    <p>Valor original da dívida: a fatura menos o que você pagou no vencimento. Rotativo: esse saldo fica {DIAS_DO_ROTATIVO} dias no crédito rotativo, até a fatura seguinte (Resolução CMN nº 4.549/2017, art. 1º), com juros à taxa do rotativo e o IOF da pessoa física ({pct(IOF_PESSOA_FISICA.aliquotaFixa)} mais {numero(IOF_PESSOA_FISICA.aliquotaDiaria*POR_CENTO,4)}% por dia; Decreto nº 6.306/2007). Depois disso o banco tem de oferecer o parcelamento em condições melhores que as do rotativo (art. 2º).</p>
    <p>Parcelamento da fatura: o saldo que sobrou do rotativo (dívida, juros e IOF) é parcelado pela tabela Price, com o IOF do parcelamento financiado, como um empréstimo sem tarifa. Teto da Lei 14.690/2023 (art. 28, § 1º, regulamentado pela Resolução CMN nº 5.112/2023): o total de juros e encargos cobrados no rotativo e no parcelamento não pode passar de {pct(TETO_DOS_JUROS,0)} do valor original, e o teto conta desde o primeiro dia do rotativo. Aqui, quando os juros acumulados chegam ao teto, as parcelas seguintes só abatem a dívida (ficam menores). Encargos são multa, juros de atraso e tarifas; o IOF é tributo e fica fora do teto. Ninguém atrasa na simulação, então multa e mora não entram.</p>
    <p>Empréstimo pessoal: pegar o valor original emprestado no vencimento e pagar a fatura inteira, pela mesma conta da calculadora de empréstimo (Price, IOF financiado, sem tarifa, no mesmo número de parcelas). O empréstimo não tem o teto da lei. As taxas sugeridas são as médias do Banco Central para a pessoa física ({TAXAS_DE_REFERENCIA.nome.replace('Taxas médias do Banco Central (','').replace(')','')}); a taxa certa é a da sua fatura e a da proposta do banco.</p>
    <p>Ficam de fora compras novas na fatura seguinte, a anuidade, o seguro, a multa e os juros de atraso, a renegociação e a portabilidade da dívida. Os meses têm 30 dias; o banco conta os dias do calendário, então o IOF pode diferir em centavos. Taxas de referência conferidas até {dataBr(TAXAS_DE_REFERENCIA.vigenteAte)}.</p>
   </Metodo>
  </>}</div>
 </div>
}

// As taxas médias do BCB envelhecem: perto do fim da conferência ou depois dele, a tela avisa (e um teste falha depois do fim).
function AvisoDeVigencia(){
 const estado=estadoDaTabela(new Date(),TAXAS_DE_REFERENCIA);
 if(estado==='vigente')return null;
 const fim=dataBr(TAXAS_DE_REFERENCIA.vigenteAte);
 return <div className="alert" role="status" style={{marginBottom:20}}>
  <strong>{estado==='fora-da-vigencia'?'Taxas de referência conferidas até '+fim:'As taxas de referência foram conferidas até '+fim}</strong>
  <p style={{margin:'8px 0 0'}}>As taxas sugeridas são médias do Banco Central e mudam todo mês. {estado==='fora-da-vigencia'?'Elas podem estar defasadas: digite as taxas da sua fatura e da proposta do banco.':'Prefira as taxas da sua fatura e da proposta do banco.'}</p>
 </div>
}

function Resumo({r}){
 const p=r.parcelamento;
 const usoDoTeto=p.jurosEEncargos/r.teto;
 return <Resultado label="Teto de juros e encargos (Lei 14.690/2023)" valor={moeda(r.teto)} metrics={[['Dívida máxima, sem o IOF',moeda(r.dividaMaxima),'orange'],['Juros do 1º mês no rotativo',moeda(r.rotativo.juros),'blue']]}>
  <p>Você deixou {moeda(r.valorOriginal)} sem pagar: é o valor original da dívida. Por lei, o banco não pode cobrar mais do que isso de juros e encargos, então a dívida para em {moeda(r.dividaMaxima)} (mais o IOF). {r.mesesParaDobrar!==null?`À taxa do rotativo, os juros chegariam ao teto em ${r.mesesParaDobrar} ${r.mesesParaDobrar===1?'mês':'meses'}; mas o rotativo só dura um mês: na fatura seguinte vêm ${moeda(r.rotativo.juros)} de juros e ${moeda(r.rotativo.iof)} de IOF, e o saldo (${moeda(r.rotativo.proximaFatura)}) vai para o parcelamento.`:`Sem juros no rotativo, na fatura seguinte vêm só ${moeda(r.rotativo.iof)} de IOF.`} {p.mesDoTeto!==null?`Em ${p.parcelas} parcelas, os juros bateriam no teto no ${p.mesDoTeto}º mês: sem a lei seriam ${moeda(p.jurosEEncargosSemTeto)} de juros; com ela, ${moeda(p.jurosEEncargos)}.`:`Em ${p.parcelas} parcelas, os juros e encargos somam ${moeda(p.jurosEEncargos)}, ${pct(usoDoTeto,0)} do teto.`}</p>
 </Resultado>
}

function TresCaminhos({r,parcelas}){
 const p=r.parcelamento,e=r.emprestimo;
 const custoSemTeto=p.jurosEEncargosSemTeto+r.rotativo.iof+p.iof;
 const diferenca=p.custoTotal-e.custoTotal;
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>O que cada caminho custa a mais</h2><p>Sobre {moeda(r.valorOriginal)} que ficaram sem pagar, em {parcelas} {parcelas===1?'parcela':'parcelas'}: juros, encargos e IOF.</p></div></div>
  <Barras items={[
   {label:`Rotativo por um mês e depois o parcelamento (${parcelas}×)`,valor:p.custoTotal,texto:moeda(p.custoTotal)},
   ...(p.mesDoTeto!==null?[{label:'O mesmo parcelamento se não houvesse o teto',valor:custoSemTeto,texto:moeda(custoSemTeto)}]:[]),
   {label:`Empréstimo pessoal para quitar a fatura (${parcelas}×)`,valor:e.custoTotal,texto:moeda(e.custoTotal)},
  ]}/>
  <div className="formula">Parcelamento: {parcelas} × até {moeda(p.parcela)} = <strong>{moeda(p.totalPago)}</strong>. Empréstimo: {parcelas} × {moeda(e.parcela)} = <strong>{moeda(e.totalPago)}</strong>. {diferenca>0?<>O empréstimo sai <strong>{moeda(diferenca)}</strong> mais barato.</>:diferenca<0?<>O parcelamento sai <strong>{moeda(-diferenca)}</strong> mais barato{p.mesDoTeto!==null?' (o teto da lei segurou os juros; o empréstimo não tem teto)':''}.</>:<>Os dois custam o mesmo.</>}</div>
  <div className="explain">Pagar a fatura inteira custa zero. Se não dá, compare a parcela do parcelamento com a de um empréstimo pessoal pelo CET de cada proposta (o do empréstimo aqui: {pct(e.cetAnual,1)} ao ano) e veja se cabe no mês. Compras novas no cartão durante o parcelamento vão para a fatura normal, fora desta conta.</div>
 </section>
}

function PassoAPasso({r}){
 const p=r.parcelamento;
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>Passo a passo</h2><p>Do vencimento até a última parcela.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Momento</th><th>O que acontece</th><th>Valor</th></tr></thead><tbody>
   <tr><td>Vencimento</td><td>Fica sem pagar (valor original da dívida)</td><td>{moeda(r.valorOriginal)}</td></tr>
   <tr><td>{DIAS_DO_ROTATIVO} dias depois</td><td>Juros do rotativo mais IOF de {moeda(r.rotativo.iof)}: saldo na fatura seguinte</td><td>{moeda(r.rotativo.proximaFatura)}</td></tr>
   <tr><td>Parcelamento</td><td>Saldo parcelado em {p.parcelas}×, com IOF de {moeda(p.iof)} financiado</td><td>{moeda(p.saldoParcelado)}</td></tr>
   <tr><td>Juros e encargos</td><td>{p.mesDoTeto!==null?`Chegam ao teto no ${p.mesDoTeto}º mês (sem o teto: ${moeda(p.jurosEEncargosSemTeto)})`:'Rotativo mais parcelamento, abaixo do teto'}</td><td>{moeda(p.jurosEEncargos)}</td></tr>
   <tr style={{fontWeight:600}}><td>Total pago</td><td>Pelos {moeda(r.valorOriginal)} que ficaram sem pagar</td><td>{moeda(p.totalPago)}</td></tr>
  </tbody></table></div>
 </section>
}

function MesAMes({r}){
 const p=r.parcelamento;
 return <details style={{marginTop:12}}><summary>Ver o parcelamento mês a mês</summary><div className="table-wrap"><table><thead><tr><th>Mês</th><th>Parcela</th><th>Juros</th><th>Amortização</th><th>Saldo devedor</th><th>Juros e encargos acumulados</th></tr></thead><tbody>
  {p.linhas.map(l=><tr key={l.mes} style={l.mes===p.mesDoTeto?{fontWeight:600}:undefined}><td>{l.mes}{l.mes===p.mesDoTeto?' (teto)':''}</td><td>{moeda(l.parcela)}</td><td>{moeda(l.juros)}</td><td>{moeda(l.amortizacao)}</td><td>{moeda(l.saldo)}</td><td>{moeda(l.jurosAcumulados)} de {moeda(r.teto)}</td></tr>)}
 </tbody></table></div><div className="explain">Os juros acumulados já contam o mês de rotativo. No mês marcado como teto, a lei corta os juros que passariam de {moeda(r.teto)}; dali em diante a parcela só abate a dívida.</div></details>
}
