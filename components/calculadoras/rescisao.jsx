'use client';
// Tela da "Rescisão": o acerto verba a verba por tipo de desligamento (saldo de salário, aviso prévio, 13º e férias
// proporcionais, descontos e a multa do FGTS). A conta fica em lib/calculos/rescisao.ts; aqui só entradas, formatação, a
// leitura do resultado e o aviso de vigência das tabelas (as mesmas do salário líquido).
import {useState} from 'react';
import {lerNumero} from '../../lib/contas.mjs';
import {rescisao,rotuloDoTipo,TIPOS,AVISOS_POR_TIPO,DIAS_DE_AVISO_BASE,DIAS_DE_AVISO_POR_ANO,TETO_DO_AVISO,ALIQUOTA_DA_MULTA,ALIQUOTA_DA_MULTA_NO_ACORDO,ALIQUOTA_DO_FGTS,DIAS_DO_MES_COMERCIAL} from '../../lib/calculos/rescisao';
import {ANO_DAS_TABELAS,DIAS_PARA_CONTAR_O_MES} from '../../lib/calculos/decimo-terceiro';
import {INSS_2026,IRRF_2026} from '../../lib/calculos/salario-liquido';
import {AvisoDeVigencia} from './salario-liquido';
import {moeda,dataBr,percentual} from '../../lib/ferramentas';
import {Campo,Seletor,Entradas,Resultado,Aviso,calcular,Metodo,Barras} from '../comum';
const n=lerNumero;
const vazio=texto=>String(texto).trim()==='';
const NOMES_DOS_MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const PRAZO_DO_ACERTO_EM_DIAS=10; // CLT, art. 477, § 6º
const pontos=valor=>percentual(valor*100);

export default function Rescisao(){
 const [bruto,B]=useState('3.000'),[admissao,A]=useState(`${ANO_DAS_TABELAS-2}-03-10`),[desligamento,S]=useState(`${ANO_DAS_TABELAS}-10-29`);
 const [tipo,T]=useState('sem-justa-causa'),[aviso,V]=useState('indenizado'),[vencidas,F]=useState('0'),[dependentes,D]=useState('0'),[fgts,G]=useState('');
 const mudarTipo=novo=>{T(novo);V(AVISOS_POR_TIPO[novo][0].valor)};
 const {r,erro}=calcular(()=>rescisao({bruto:n(bruto),admissao,desligamento,tipo,aviso,feriasVencidas:n(vencidas),dependentes:n(dependentes),saldoDoFgts:vazio(fgts)?null:n(fgts)}));
 return <div className="calculator-grid">
  <Entradas>
   <Campo label="Salário bruto mensal" prefix="R$" value={bruto} onChange={B} hint="O salário fixo, antes dos descontos. Horas extras e comissões ficam de fora desta conta."/>
   <Campo label="Data de admissão" type="date" value={admissao} onChange={A} min={`${ANO_DAS_TABELAS-50}-01-01`} max={`${ANO_DAS_TABELAS}-12-31`} hint="Conta os anos de casa para o aviso prévio e o período das férias."/>
   <Campo label="Último dia trabalhado" type="date" value={desligamento} onChange={S} min={`${ANO_DAS_TABELAS-50}-01-01`} max={`${ANO_DAS_TABELAS}-12-31`} hint={`Com aviso trabalhado, o último dia do aviso. O saldo de salário é a parte do mês até esse dia, sobre ${DIAS_DO_MES_COMERCIAL} dias.`}/>
   <Seletor label="Tipo de desligamento" value={tipo} onChange={mudarTipo} items={TIPOS.map(t=>[t.valor,t.rotulo])}/>
   <Seletor label="Aviso prévio" value={aviso} onChange={V} items={AVISOS_POR_TIPO[tipo].map(a=>[a.valor,a.rotulo])}/>
   <Seletor label="Períodos de férias completos e ainda não tirados" value={vencidas} onChange={F} items={[['0','Nenhum'],['1','1 período (12 meses)'],['2','2 períodos']]}/>
   <Campo label="Dependentes no imposto de renda" value={dependentes} onChange={D} hint={`Cada um deduz ${moeda(IRRF_2026.dependente)} da base do imposto, se as deduções legais forem melhores que o desconto simplificado.`}/>
   <Campo label="Saldo do FGTS no extrato (opcional)" prefix="R$" value={fgts} onChange={G} hint={`A multa é calculada sobre ele. Em branco, estimamos ${pontos(ALIQUOTA_DO_FGTS)} do salário por mês de contrato, sem os rendimentos da conta.`}/>
   <p className="small-note">Simulação com os valores que você digitou; não é previsão nem recomendação.</p>
  </Entradas>
  <div className="results">
   <AvisoDeVigencia/>
   {erro?<Aviso error={erro}/>:<>
   <Resumo r={r}/>
   <section className="panel chart-panel"><div className="chart-head"><div><h2>Para onde vai o acerto</h2><p>Cada verba em reais, os descontos e a multa do FGTS, que sai pela conta do FGTS.</p></div></div>
    <Barras items={[
     {label:'Saldo de salário',valor:r.saldo.valor},{label:'Aviso prévio',valor:r.avisoPrevio.valor},{label:'13º proporcional',valor:r.decimo.valor},
     {label:'Férias com 1/3',valor:r.ferias.proporcionais+r.ferias.tercoProporcionais+r.ferias.vencidas+r.ferias.tercoVencidas},
     {label:'Multa do FGTS',valor:r.fgts.multa},{label:'Descontos',valor:r.descontos},
    ].map(i=>({...i,texto:moeda(i.valor)}))}/>
   </section>
   <VerbaAVerba r={r}/>
   <Fgts r={r}/>
   {r.decimo.avos>0&&<MesesDo13 r={r}/>}
   <Metodo>
    <p>Saldo de salário (CLT, art. 64): o salário dividido por {DIAS_DO_MES_COMERCIAL} dias, vezes os dias trabalhados no mês do desligamento. Aviso prévio (CLT, arts. 487 a 491; Lei nº 12.506/2011): {DIAS_DE_AVISO_BASE} dias mais {DIAS_DE_AVISO_POR_ANO} por ano completo na empresa, até {TETO_DO_AVISO}. Indenizado, é pago no acerto e o contrato se projeta por esses dias para o 13º e as férias (art. 487, § 1º); no acordo do art. 484-A, pela metade. Trabalhado, os {DIAS_DE_AVISO_BASE} dias são salário normal e só os dias a mais são indenizados (Nota Técnica SRT/MTE nº 184/2012). No pedido de demissão sem o aviso cumprido, a empresa desconta um salário (art. 487, § 2º), aqui limitado ao que há para receber.</p>
    <p>13º proporcional (Lei nº 4.090/1962): 1/12 do salário por mês do ano com {DIAS_PARA_CONTAR_O_MES} dias ou mais de contrato, até o fim projetado; não é devido na justa causa. Férias (CLT, arts. 130, 146 e 147): as vencidas são os períodos de 12 meses completos e não gozados, um salário mais 1/3 cada, em qualquer tipo; as proporcionais são 1/12 por mês do período em curso, contado data a data desde o aniversário da admissão (mês com {DIAS_PARA_CONTAR_O_MES} dias ou mais conta inteiro), mais 1/3, exceto na justa causa.</p>
    <p>Descontos: INSS por faixa (Portaria Interministerial MPS/MF nº 13/2026: 7,5% até {moeda(INSS_2026.faixas[0].ate)}, 9% até {moeda(INSS_2026.faixas[1].ate)}, 12% até {moeda(INSS_2026.faixas[2].ate)} e 14% até o teto de {moeda(INSS_2026.teto)}) e imposto de renda (Lei nº 15.191/2025, com a redução da Lei nº 15.270/2025 e as deduções legais ou o desconto simplificado, o que der a base menor) sobre o saldo de salário e, em separado, sobre o 13º (Lei 8.212/1991, art. 28, § 7º; Lei 7.713/1988, art. 26). Não há INSS nem imposto sobre o aviso prévio indenizado, as férias indenizadas com o terço e a multa do FGTS.</p>
    <p>Multa do FGTS (Lei nº 8.036/1990, art. 18, § 1º; CLT, art. 484-A): {pontos(ALIQUOTA_DA_MULTA)} na dispensa sem justa causa e {pontos(ALIQUOTA_DA_MULTA_NO_ACORDO)} no acordo, sobre o saldo da conta mais os {pontos(ALIQUOTA_DO_FGTS)} das verbas do acerto que têm FGTS (saldo de salário, 13º e aviso indenizado). Sem o saldo do extrato, a conta estima {pontos(ALIQUOTA_DO_FGTS)} do salário por mês de contrato, sem rendimentos nem saques.</p>
    <p>Ficam de fora: contrato de experiência e por prazo determinado, horas extras e médias, adiantamento do 13º já pago, faltas e afastamentos que tiram avos, a dobra das férias vencidas há mais de um ano, pensão alimentícia, seguro-desemprego e o saque do FGTS.</p>
   </Metodo>
  </>}</div>
 </div>
}

function Resumo({r}){
 const comMulta=r.fgts.multa>0;
 const tributos=r.descontos-r.avisoPrevio.desconto; // o desconto do aviso já está em r.descontos: o texto separa os dois para não somar duas vezes
 const desconto=r.avisoPrevio.desconto>0?` e ${moeda(r.avisoPrevio.desconto)} do aviso prévio não cumprido`:'';
 return <Resultado label={comMulta?'Total a receber, com a multa do FGTS':'Acerto a receber'} valor={moeda(r.total)} metrics={[['Acerto pago pela empresa',moeda(r.liquido),'blue'],['Multa do FGTS',moeda(r.fgts.multa),'green'],['Descontos',moeda(r.descontos),'orange']]}>
  <p>{rotuloDoTipo(r.tipo)}: as verbas somam {moeda(r.verbas)}; saem {moeda(tributos)} de INSS e imposto de renda{desconto}, e a empresa paga {moeda(r.liquido)} em até {PRAZO_DO_ACERTO_EM_DIAS} dias depois do desligamento. {comMulta?`A multa de ${pontos(r.fgts.aliquota)} do FGTS, ${moeda(r.fgts.multa)}, é depositada na conta do FGTS e sacada com o saldo.`:'Neste tipo de desligamento não há multa do FGTS.'}{r.avisoPrevio.dias>0?` O contrato se projeta até ${dataBr(r.dataFinal)} pelos ${r.avisoPrevio.dias} dias de aviso indenizado.`:''}</p>
 </Resultado>
}

function VerbaAVerba({r}){
 const verbas=r.linhas.filter(l=>l.tipo==='verba'),descontos=r.linhas.filter(l=>l.tipo==='desconto');
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>Verba a verba</h2><p>Como aparece no termo de rescisão (TRCT): o que entra e o que sai.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Verba</th><th>Valor</th></tr></thead><tbody>
   {verbas.map(l=><tr key={l.rotulo}><td>{l.rotulo}</td><td>{moeda(l.valor)}</td></tr>)}
   <tr><td><strong>Total das verbas</strong></td><td><strong>{moeda(r.verbas)}</strong></td></tr>
   {descontos.map(l=><tr key={l.rotulo}><td>(−) {l.rotulo}</td><td>− {moeda(l.valor)}</td></tr>)}
   <tr><td><strong>Líquido do acerto</strong></td><td><strong>{moeda(r.liquido)}</strong></td></tr>
  </tbody></table></div>
  <p className="small-note">Férias: {r.ferias.avos>0?`${r.ferias.avos} avos do período em curso desde ${dataBr(r.ferias.inicioDoPeriodo)}, contados até ${dataBr(r.dataFinal)}`:'sem férias proporcionais neste tipo de desligamento'}{r.ferias.periodosVencidos>0?`, mais ${r.ferias.periodosVencidos} ${r.ferias.periodosVencidos===1?'período vencido':'períodos vencidos'}`:''}. {r.anosCompletos} {r.anosCompletos===1?'ano completo':'anos completos'} na empresa.</p>
 </section>
}

function Fgts({r}){
 const {fgts}=r;
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>FGTS</h2><p>A multa não vem no acerto: é depositada na conta do FGTS.</p></div></div>
  <div className="table-wrap"><table><tbody>
   <tr><td>{fgts.saldoInformado?'Saldo informado':`Saldo estimado (${pontos(ALIQUOTA_DO_FGTS)} × ${fgts.mesesDoContrato} ${fgts.mesesDoContrato===1?'mês':'meses'} de contrato, sem rendimentos)`}</td><td>{moeda(fgts.saldo)}</td></tr>
   <tr><td>Depósitos sobre o acerto ({pontos(ALIQUOTA_DO_FGTS)} do saldo de salário, do 13º e do aviso indenizado)</td><td>{moeda(fgts.depositosDaRescisao)}</td></tr>
   <tr><td>Base da multa</td><td>{moeda(fgts.base)}</td></tr>
   <tr><td><strong>Multa de {pontos(fgts.aliquota)}</strong></td><td><strong>{moeda(fgts.multa)}</strong></td></tr>
  </tbody></table></div>
  <p className="small-note">{r.tipo==='sem-justa-causa'?'Na dispensa sem justa causa o saldo da conta pode ser sacado por inteiro, e há seguro-desemprego para quem cumpre os requisitos.':r.tipo==='acordo'?'No acordo o saque é de 80% do saldo e não há seguro-desemprego.':'No pedido de demissão e na justa causa não há multa, saque do FGTS nem seguro-desemprego; o saldo fica na conta.'}</p>
 </section>
}

function MesesDo13({r}){
 const anos=new Set(r.decimo.meses.map(m=>m.ano));
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>Os meses do 13º</h2><p>Um mês conta como avo com {DIAS_PARA_CONTAR_O_MES} dias ou mais de contrato, até o fim projetado.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Mês</th><th>Dias de contrato</th><th>Conta?</th></tr></thead><tbody>
   {r.decimo.meses.map(m=><tr key={`${m.ano}-${m.mes}`}><td>{NOMES_DOS_MESES[m.mes-1]}{anos.size>1?` de ${m.ano}`:''}</td><td>{m.dias}</td><td>{m.conta?'sim':'não'}</td></tr>)}
   <tr><td><strong>Total</strong></td><td></td><td><strong>{r.decimo.avos} avos</strong></td></tr>
  </tbody></table></div>
 </section>
}
