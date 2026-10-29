'use client';
// Tela das "Férias": o recibo de férias linha a linha (férias com o terço, abono pecuniário, adiantamento do 13º, INSS e imposto
// de renda) e o líquido que cai na conta. A conta fica em lib/calculos/ferias.ts; aqui só entradas, formatação, a leitura do
// resultado e o aviso de vigência das tabelas (as mesmas do salário líquido).
import {useState} from 'react';
import {lerNumero} from '../../lib/contas.mjs';
import {ferias,diasDeFeriasPorFaltas,maximoDeDiasVendidos,DIAS_DE_FERIAS,FRACAO_DO_ABONO,MENOR_PERIODO_DE_FERIAS,DIAS_DE_ANTECEDENCIA_DO_PAGAMENTO,TABELA_DE_FALTAS} from '../../lib/calculos/ferias';
import {DIAS_DO_MES_COMERCIAL} from '../../lib/calculos/rescisao';
import {ANO_DAS_TABELAS} from '../../lib/calculos/decimo-terceiro';
import {INSS_2026,IRRF_2026} from '../../lib/calculos/salario-liquido';
import {AvisoDeVigencia} from './salario-liquido';
import {moeda,dataBr,percentual} from '../../lib/ferramentas';
import {Campo,Seletor,Entradas,Resultado,Aviso,calcular,Metodo,Barras} from '../comum';
const n=lerNumero;
const vazio=texto=>String(texto).trim()==='';
const pontos=valor=>percentual(valor*100);
const inteiro=texto=>Math.max(0,Math.floor(n(texto)||0));
const TODOS='todos'; // opção do seletor de dias: tudo o que não foi vendido

export default function Ferias(){
 const [bruto,B]=useState('3.000'),[medias,M]=useState(''),[faltas,F]=useState('0'),[vendidos,V]=useState('0'),[dias,S]=useState(TODOS);
 const [adiantar,A]=useState('nao'),[dependentes,D]=useState('0'),[inicio,I]=useState('');
 const direito=diasDeFeriasPorFaltas(inteiro(faltas)),maximo=maximoDeDiasVendidos(direito),sobram=direito-inteiro(vendidos);
 const mudarVendidos=novo=>{V(novo);S(TODOS)};
 // Mudar as faltas muda o teto do abono e os dias que sobram: o que passou do teto volta para o teto, e os dias voltam para "todos".
 const mudarFaltas=novo=>{F(novo);const teto=maximoDeDiasVendidos(diasDeFeriasPorFaltas(inteiro(novo)));if(inteiro(vendidos)>teto)V(String(teto));S(TODOS)};
 const opcoesDeDias=[[TODOS,sobram>0?`Todos os ${sobram} dias que sobram`:'Todos os dias']];
 for(let d=MENOR_PERIODO_DE_FERIAS;d<sobram;d++)opcoesDeDias.push([String(d),`${d} dias (o resto fica para outro período)`]);
 const {r,erro}=calcular(()=>ferias({bruto:n(bruto),medias:vazio(medias)?0:n(medias),faltas:n(faltas),diasVendidos:n(vendidos),dias:dias===TODOS?undefined:n(dias),adiantarDecimo:adiantar==='sim',dependentes:n(dependentes),inicio}));
 return <div className="calculator-grid">
  <Entradas>
   <Campo label="Salário bruto mensal" prefix="R$" value={bruto} onChange={B} hint="O salário fixo, antes dos descontos. É a base das férias e do terço."/>
   <Campo label="Média de horas extras, adicionais e comissões (opcional)" prefix="R$" value={medias} onChange={M} hint="Por mês, no período aquisitivo. Entra na base das férias (CLT, art. 142), mas não no adiantamento do 13º."/>
   <Campo label="Faltas sem justificativa nos últimos 12 meses" value={faltas} onChange={mudarFaltas} hint={`Até 5 faltas, ${DIAS_DE_FERIAS} dias de férias; de 6 a 14, 24 dias; de 15 a 23, 18; de 24 a 32, 12 (CLT, art. 130).`}/>
   <Seletor label="Dias vendidos (abono pecuniário)" value={vendidos} onChange={mudarVendidos} items={[['0','Não vender'],...Array.from({length:maximo},(_,i)=>[String(i+1),`${i+1} ${i===0?'dia':'dias'}`])]}/>
   <Seletor label="Dias de férias desta vez" value={dias} onChange={S} items={opcoesDeDias}/>
   <Seletor label="Adiantar a primeira parcela do 13º?" value={adiantar} onChange={A} items={[['nao','Não'],['sim','Sim, metade do salário junto com as férias']]}/>
   <Campo label="Dependentes no imposto de renda" value={dependentes} onChange={D} hint={`Cada um deduz ${moeda(IRRF_2026.dependente)} da base do imposto, se as deduções legais forem melhores que o desconto simplificado.`}/>
   <Campo label="Primeiro dia das férias (opcional)" type="date" value={inicio} onChange={I} min={`${ANO_DAS_TABELAS}-01-01`} max={`${ANO_DAS_TABELAS+1}-12-31`} hint={`Só para mostrar até quando a empresa deve pagar: ${DIAS_DE_ANTECEDENCIA_DO_PAGAMENTO} dias antes do início (CLT, art. 145).`}/>
   <p className="small-note">Simulação com os valores que você digitou; não é previsão nem recomendação.</p>
  </Entradas>
  <div className="results">
   <AvisoDeVigencia/>
   {erro?<Aviso error={erro}/>:<>
   <Resumo r={r}/>
   <section className="panel chart-panel"><div className="chart-head"><div><h2>De onde vem o valor</h2><p>Cada linha do recibo em reais; os descontos saem só das férias e do terço.</p></div></div>
    <Barras items={[
     {label:`Férias (${r.dias} dias)`,valor:r.ferias},{label:'Terço constitucional',valor:r.terco},
     {label:'Abono com o terço',valor:r.abono+r.tercoDoAbono},{label:'Adiantamento do 13º',valor:r.adiantamento},{label:'Descontos',valor:r.descontos},
    ].map(i=>({...i,texto:moeda(i.valor)}))}/>
   </section>
   <LinhaALinha r={r}/>
   <Descontos r={r}/>
   <Metodo>
    <p>Dias de férias (CLT, art. 130): {DIAS_DE_FERIAS} por período aquisitivo de 12 meses, menos conforme as faltas sem justificativa ({TABELA_DE_FALTAS.map(f=>`até ${f.ate}: ${f.dias} dias`).join('; ')}; acima de {TABELA_DE_FALTAS[TABELA_DE_FALTAS.length-1].ate}, nenhum). Férias: a base (salário mais a média das parcelas variáveis, art. 142) dividida por {DIAS_DO_MES_COMERCIAL} e multiplicada pelos dias de descanso; mais um terço (Constituição, art. 7º, XVII). Fracionamento (art. 134, § 1º): até três períodos, um com 14 dias ou mais e nenhum com menos de {MENOR_PERIODO_DE_FERIAS}.</p>
    <p>Abono pecuniário (art. 143): até 1/{FRACAO_DO_ABONO} dos dias de direito vendidos à empresa, pagos como salário mais o terço, sem INSS (Lei 8.212/1991, art. 28, § 9º) nem imposto de renda (Lei 7.713/1988, art. 6º). Adiantamento do 13º (Lei 4.749/1965, art. 2º): metade do salário, sem desconto na hora; o INSS e o imposto do 13º ficam para a segunda parcela, em dezembro.</p>
    <p>Descontos sobre férias e terço, em separado do salário do mês: INSS por faixa (Portaria Interministerial MPS/MF nº 13/2026: 7,5% até {moeda(INSS_2026.faixas[0].ate)}, 9% até {moeda(INSS_2026.faixas[1].ate)}, 12% até {moeda(INSS_2026.faixas[2].ate)} e 14% até o teto de {moeda(INSS_2026.teto)}) e imposto de renda (Lei nº 15.191/2025, com a redução da Lei nº 15.270/2025 e as deduções legais ou o desconto simplificado, o que der a base menor; IN RFB nº 1.500/2014, art. 12). Pagamento até {DIAS_DE_ANTECEDENCIA_DO_PAGAMENTO} dias antes do início (art. 145).</p>
    <p>Ficam de fora: férias proporcionais e vencidas no acerto (veja a calculadora de rescisão), férias coletivas, a dobra por atraso na concessão (art. 137), o salário dos dias trabalhados no mês das férias, pensão alimentícia, empregado doméstico e aprendiz.</p>
   </Metodo>
  </>}</div>
 </div>
}

function Resumo({r}){
 const extras=[r.abono>0?`${moeda(r.abono+r.tercoDoAbono)} do abono de ${r.diasVendidos} dias com o terço`:'',r.adiantamento>0?`${moeda(r.adiantamento)} do adiantamento do 13º`:''].filter(Boolean);
 return <Resultado label="Cai na conta antes das férias" valor={moeda(r.liquido)} metrics={[['Férias com o terço',moeda(r.ferias+r.terco),'blue'],['Abono e 13º, sem desconto',moeda(r.abono+r.tercoDoAbono+r.adiantamento),'green'],['INSS e imposto de renda',moeda(r.descontos),'orange']]}>
  <p>{r.dias} dias de férias sobre {moeda(r.base)} por mês: {moeda(r.ferias)}, mais {moeda(r.terco)} do terço constitucional. Saem {moeda(r.inss.valor)} de INSS{r.irrf.valor>0?` e ${moeda(r.irrf.valor)} de imposto de renda`:', e o imposto de renda fica em zero'}.{extras.length>0?` Entram ainda ${extras.join(' e ')}, sem desconto.`:''}{r.pagarAte?` A empresa deve pagar até ${dataBr(r.pagarAte)}.`:''}</p>
 </Resultado>
}

function LinhaALinha({r}){
 const verbas=r.linhas.filter(l=>l.tipo==='verba'),descontos=r.linhas.filter(l=>l.tipo==='desconto');
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>Linha a linha</h2><p>Como aparece no recibo de férias: o que entra e o que sai.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Linha</th><th>Valor</th></tr></thead><tbody>
   {verbas.map(l=><tr key={l.rotulo}><td>{l.rotulo}</td><td>{moeda(l.valor)}</td></tr>)}
   <tr><td><strong>Total das verbas</strong></td><td><strong>{moeda(r.verbas)}</strong></td></tr>
   {descontos.map(l=><tr key={l.rotulo}><td>(−) {l.rotulo}</td><td>− {moeda(l.valor)}</td></tr>)}
   <tr><td><strong>Líquido</strong></td><td><strong>{moeda(r.liquido)}</strong></td></tr>
  </tbody></table></div>
  <p className="small-note">{r.diasDeDireito} dias de direito neste período{r.diasVendidos>0?`, ${r.diasVendidos} vendidos`:''}{r.dias<r.diasDeDireito-r.diasVendidos?`, ${r.diasDeDireito-r.diasVendidos-r.dias} ficam para outro período`:''}. Dá para vender até {r.maximoVendidos} dias.</p>
 </section>
}

function Descontos({r}){
 const {inss,irrf}=r;
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>INSS e imposto de renda</h2><p>Calculados sobre férias e terço, em separado do salário do mês.</p></div></div>
  <div className="table-wrap"><table><tbody>
   <tr><td>Base: férias mais o terço</td><td>{moeda(r.rendimentoTributavel)}</td></tr>
   <tr><td>INSS por faixa ({pontos(inss.aliquotaEfetiva)} efetivos{inss.noTeto?', no teto':''})</td><td>{moeda(inss.valor)}</td></tr>
   <tr><td>Base do imposto ({irrf.modo==='legal'?'deduções legais':'desconto simplificado'})</td><td>{moeda(irrf.base)}</td></tr>
   <tr><td>Imposto pela tabela ({pontos(irrf.aliquota)} menos {moeda(irrf.parcelaADeduzir)})</td><td>{moeda(irrf.impostoPelaTabela)}</td></tr>
   <tr><td>Redução da Lei 15.270/2025</td><td>− {moeda(irrf.reducao)}</td></tr>
   <tr><td><strong>Imposto de renda</strong></td><td><strong>{moeda(irrf.valor)}</strong></td></tr>
  </tbody></table></div>
  <p className="small-note">Abono pecuniário e adiantamento do 13º não entram na base. Algumas empresas aplicam a redução do imposto de um jeito diferente nas férias: confira o recibo.</p>
 </section>
}
