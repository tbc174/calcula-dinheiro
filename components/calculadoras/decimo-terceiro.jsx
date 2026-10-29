'use client';
// Tela do "13º salário": avos pela regra dos 15 dias, 1ª parcela (metade, sem desconto) e 2ª parcela com o INSS e o
// imposto de renda sobre o 13º inteiro. A conta fica em lib/calculos/decimo-terceiro.ts; aqui só entradas, formatação,
// a leitura do resultado e o aviso de vigência das tabelas (as mesmas do salário líquido).
import {useState} from 'react';
import {lerNumero} from '../../lib/contas.mjs';
import {decimoTerceiro,ANO_DAS_TABELAS,MESES_DO_ANO,DIAS_PARA_CONTAR_O_MES,prazoDaPrimeiraParcela,prazoDaSegundaParcela} from '../../lib/calculos/decimo-terceiro';
import {INSS_2026,IRRF_2026} from '../../lib/calculos/salario-liquido';
import {AvisoDeVigencia,TabelaDoInss,CaminhoDoImposto} from './salario-liquido';
import {moeda,dataBr} from '../../lib/ferramentas';
import {Campo,Entradas,Resultado,Aviso,calcular,Metodo,Barras} from '../comum';
const n=lerNumero;
const NOMES_DOS_MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const vazio=texto=>String(texto).trim()==='';

export default function DecimoTerceiro(){
 const [bruto,B]=useState('3.000'),[medias,M]=useState('0'),[dependentes,D]=useState('0'),[admissao,A]=useState(`${ANO_DAS_TABELAS}-01-01`),[primeira,P]=useState('');
 const {r,erro}=calcular(()=>decimoTerceiro({bruto:n(bruto),medias:vazio(medias)?0:n(medias),dependentes:n(dependentes),admissao,adiantamento:vazio(primeira)?null:n(primeira)}));
 return <div className="calculator-grid">
  <Entradas>
   <Campo label="Salário bruto mensal" prefix="R$" value={bruto} onChange={B} hint="O salário de dezembro, antes dos descontos. O 13º é calculado sobre ele."/>
   <Campo label="Médias de horas extras, comissões e adicionais (opcional)" prefix="R$" value={medias} onChange={M} hint="A média mensal do ano entra na base do 13º. Deixe zero se você só recebe o salário fixo."/>
   <Campo label="Dependentes no imposto de renda" value={dependentes} onChange={D} hint={`Cada um deduz ${moeda(IRRF_2026.dependente)} da base, se as deduções legais forem melhores que o desconto simplificado.`}/>
   <Campo label={`Data de admissão`} type="date" value={admissao} onChange={A} min={`${ANO_DAS_TABELAS-50}-01-01`} max={`${ANO_DAS_TABELAS}-12-31`} hint={`Quem entrou antes de ${ANO_DAS_TABELAS} recebe o 13º integral. Quem entrou durante o ano recebe 1/12 por mês com ${DIAS_PARA_CONTAR_O_MES} dias ou mais de trabalho.`}/>
   <Campo label="1ª parcela já recebida (opcional)" prefix="R$" value={primeira} onChange={P} hint="Se a empresa já pagou o adiantamento (nas férias ou em novembro), informe o valor exato. Em branco, usamos a metade do 13º."/>
   <p className="small-note">Simulação com os valores que você digitou; não é previsão nem recomendação.</p>
  </Entradas>
  <div className="results">
   <AvisoDeVigencia/>
   {erro?<Aviso error={erro}/>:<>
   <Resumo r={r}/>
   <section className="panel chart-panel"><div className="chart-head"><div><h2>Para onde vai o 13º</h2><p>As duas parcelas que caem na conta e os dois descontos, em reais.</p></div></div>
    <Barras items={[{label:'1ª parcela',valor:r.primeiraParcela,texto:moeda(r.primeiraParcela)},{label:'2ª parcela',valor:r.segundaParcela,texto:moeda(r.segundaParcela)},{label:'INSS',valor:r.inss.valor,texto:moeda(r.inss.valor)},{label:'Imposto de renda',valor:r.irrf.valor,texto:moeda(r.irrf.valor)}]}/>
   </section>
   {r.avos<MESES_DO_ANO&&<MesesQueContam r={r}/>}
   <TabelaDoInss r={{bruto:r.valor,inss:r.inss}}/>
   <CaminhoDoImposto r={{bruto:r.valor,irrf:r.irrf,dependentes:r.dependentes}} rotuloFinal="Imposto de renda do 13º"/>
   <Metodo>
    <p>Valor do 13º (Lei nº 4.090/1962 e Decreto nº 10.854/2021): 1/12 da remuneração de dezembro (salário mais as médias de horas extras, comissões e adicionais) por mês trabalhado no ano. Um mês com {DIAS_PARA_CONTAR_O_MES} dias ou mais de trabalho conta inteiro; com menos, não conta. Quem entrou antes do ano tem os 12 avos.</p>
    <p>1ª parcela (Lei nº 4.749/1965): até {dataBr(prazoDaPrimeiraParcela(r.ano))}, metade do 13º, sem INSS nem imposto de renda. 2ª parcela: até {dataBr(prazoDaSegundaParcela(r.ano))}, o 13º inteiro menos a 1ª parcela, o INSS e o imposto de renda, os dois calculados sobre o 13º inteiro e separados do salário do mês.</p>
    <p>INSS por faixa (Portaria Interministerial MPS/MF nº 13/2026): 7,5% até {moeda(INSS_2026.faixas[0].ate)}, 9% até {moeda(INSS_2026.faixas[1].ate)}, 12% até {moeda(INSS_2026.faixas[2].ate)} e 14% até o teto de {moeda(INSS_2026.teto)}, cada alíquota só sobre a fatia do 13º dentro da faixa. Imposto de renda (tabela da Lei nº 15.191/2025): tributação exclusiva na fonte sobre o 13º, com as deduções legais (o INSS do 13º e {moeda(IRRF_2026.dependente)} por dependente) ou o desconto simplificado de {moeda(IRRF_2026.simplificado)}, o que der a base menor (IN RFB nº 2.141/2023), e a redução da Lei nº 15.270/2025 aplicada ao 13º em separado: até {moeda(IRRF_2026.reducao.ate)} de 13º o imposto zera; até {moeda(IRRF_2026.reducao.limite)}, redução = {moeda(IRRF_2026.reducao.constante)} − {IRRF_2026.reducao.coeficiente.toString().replace('.',',')} × 13º, limitada ao imposto.</p>
    <p>Ficam de fora: faltas e afastamentos que tiram o avo, pensão alimentícia, previdência privada, o 13º pago na rescisão, mais de um emprego e os regimes próprios de servidor.</p>
   </Metodo>
  </>}</div>
 </div>
}

function Resumo({r}){
 const {inss,irrf}=r;
 const integral=r.avos===MESES_DO_ANO;
 return <Resultado label={`2ª parcela, até ${dataBr(prazoDaSegundaParcela(r.ano))}`} valor={moeda(r.segundaParcela)} metrics={[[`1ª parcela, até ${dataBr(prazoDaPrimeiraParcela(r.ano))}`,moeda(r.primeiraParcela),'blue'],['13º bruto',moeda(r.valor),'green'],['INSS e imposto de renda',moeda(r.descontos),'orange']]}>
  <p>{integral?`13º integral de ${r.ano}: ${moeda(r.valor)}, a remuneração de dezembro inteira${r.medias>0?` (${moeda(r.base-r.medias)} de salário mais ${moeda(r.medias)} de médias)`:''}.`:`${r.avos} avos de ${r.ano}: ${moeda(r.base)} × ${r.avos}/12 = ${moeda(r.valor)}.`} {r.adiantamentoInformado?`A 1ª parcela informada foi ${moeda(r.primeiraParcela)}.`:`A 1ª parcela é a metade, ${moeda(r.primeiraParcela)}, sem desconto.`} Na 2ª saem o INSS de {moeda(inss.valor)}{inss.noTeto?' (no teto)':''} e {irrf.valor>0?`o imposto de renda de ${moeda(irrf.valor)}${irrf.reducao>0?`, já com ${moeda(irrf.reducao)} de redução da Lei 15.270/2025`:''}`:(irrf.reducao>0?`nenhum imposto de renda (pela tabela seriam ${moeda(irrf.impostoPelaTabela)}, zerados pela redução da Lei 15.270/2025)`:'nenhum imposto de renda (a base fica na faixa isenta)')}. No total, {moeda(r.liquido)} líquidos.</p>
 </Resultado>
}

function MesesQueContam({r}){
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>Os meses que contam</h2><p>Um mês conta como avo com {DIAS_PARA_CONTAR_O_MES} dias ou mais de trabalho.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Mês</th><th>Dias trabalhados</th><th>Conta?</th></tr></thead><tbody>
   {r.meses.map(m=><tr key={m.mes}><td>{NOMES_DOS_MESES[m.mes-1]}</td><td>{m.dias}</td><td>{m.conta?'sim':'não'}</td></tr>)}
   <tr><td><strong>Total</strong></td><td></td><td><strong>{r.avos} de 12 avos</strong></td></tr>
  </tbody></table></div>
 </section>
}
