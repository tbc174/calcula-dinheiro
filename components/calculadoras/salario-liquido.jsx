'use client';
// Tela do "salário líquido": bruto − INSS por faixa − imposto de renda (com dependentes ou desconto simplificado e a
// redução da Lei 15.270/2025) − outros descontos. A conta fica em lib/calculos/salario-liquido.ts; aqui só entradas,
// formatação, a leitura do resultado e o aviso de vigência das tabelas.
import {useState} from 'react';
import {lerNumero} from '../../lib/contas.mjs';
import {salarioLiquido,estadoDaTabela,INSS_2026,IRRF_2026} from '../../lib/calculos/salario-liquido';
import {moeda,numero,dataBr} from '../../lib/ferramentas';
import {Campo,Entradas,Resultado,Aviso,calcular,Metodo,Barras} from '../comum';
const n=lerNumero;
const POR_CENTO=100;
const pct=(fracao,casas=1)=>numero(fracao*POR_CENTO,casas)+'%';

export default function SalarioLiquido(){
 const [bruto,B]=useState('3.000'),[dependentes,D]=useState('0'),[outros,O]=useState('0');
 const {r,erro}=calcular(()=>salarioLiquido({bruto:n(bruto),dependentes:n(dependentes),outrosDescontos:n(outros)}));
 return <div className="calculator-grid">
  <Entradas>
   <Campo label="Salário bruto do mês" prefix="R$" value={bruto} onChange={B} hint="O valor antes de qualquer desconto, como está no contrato ou no holerite."/>
   <Campo label="Dependentes no imposto de renda" value={dependentes} onChange={D} hint={`Cada um deduz ${moeda(IRRF_2026.dependente)} da base, se as deduções legais forem melhores que o desconto simplificado.`}/>
   <Campo label="Outros descontos (opcional)" prefix="R$" value={outros} onChange={O} hint="Vale-transporte, plano de saúde, coparticipação: saem do líquido, mas não mudam o imposto."/>
   <p className="small-note">Simulação com os valores que você digitou; não é previsão nem recomendação.</p>
  </Entradas>
  <div className="results">
   <AvisoDeVigencia/>
   {erro?<Aviso error={erro}/>:<>
   <Resumo r={r}/>
   <section className="panel chart-panel"><div className="chart-head"><div><h2>Para onde vai o salário bruto</h2><p>O que fica com você e cada desconto, em reais.</p></div></div>
    <Barras items={[{label:'Salário líquido',valor:r.liquido,texto:moeda(r.liquido)},{label:'INSS',valor:r.inss.valor,texto:moeda(r.inss.valor)},{label:'Imposto de renda',valor:r.irrf.valor,texto:moeda(r.irrf.valor)},...(r.outrosDescontos>0?[{label:'Outros descontos',valor:r.outrosDescontos,texto:moeda(r.outrosDescontos)}]:[])]}/>
   </section>
   <TabelaDoInss r={r}/>
   <CaminhoDoImposto r={r}/>
   <Metodo>
    <p>INSS por faixa (Portaria Interministerial MPS/MF nº 13/2026): 7,5% até {moeda(INSS_2026.faixas[0].ate)}, 9% até {moeda(INSS_2026.faixas[1].ate)}, 12% até {moeda(INSS_2026.faixas[2].ate)} e 14% até o teto de {moeda(INSS_2026.teto)}; cada alíquota só sobre a fatia do salário dentro da faixa. Acima do teto o desconto não cresce.</p>
    <p>Imposto de renda (tabela da Lei nº 15.191/2025): base = bruto − deduções. Deduções legais: o INSS e {moeda(IRRF_2026.dependente)} por dependente; ou o desconto simplificado de {moeda(IRRF_2026.simplificado)}, sem dependentes; vale a base menor. Sobre a base: isento até {moeda(IRRF_2026.faixas[0].ate)}; 7,5%, 15%, 22,5% e 27,5% nas faixas seguintes, menos a parcela a deduzir de cada faixa.</p>
    <p>Redução da Lei nº 15.270/2025, desde janeiro de 2026: com salário bruto até {moeda(IRRF_2026.reducao.ate)}, a redução vai até {moeda(IRRF_2026.reducao.maxima)} e zera o imposto; de lá até {moeda(IRRF_2026.reducao.limite)}, redução = {moeda(IRRF_2026.reducao.constante)} − {IRRF_2026.reducao.coeficiente.toString().replace('.',',')} × salário bruto, limitada ao imposto; acima disso, nenhuma. Ficam de fora 13º, férias, horas extras, pensão alimentícia, previdência privada, salário-família e outros vínculos.</p>
   </Metodo>
  </>}</div>
 </div>
}

// Risco 4 do plano: as tabelas vencem; perto do fim ou depois dele, a tela avisa (e um teste falha depois do fim).
export function AvisoDeVigencia(){
 const estado=estadoDaTabela(new Date(),INSS_2026);
 if(estado==='vigente')return null;
 const fim=dataBr(INSS_2026.vigenteAte);
 return <div className="alert" role="status" style={{marginBottom:20}}>
  <strong>{estado==='fora-da-vigencia'?'Tabelas de 2026, fora da vigência':'As tabelas de 2026 vencem em '+fim}</strong>
  <p style={{margin:'8px 0 0'}}>{estado==='fora-da-vigencia'?`Esta calculadora usa as tabelas de INSS e imposto de renda de 2026, conferidas até ${fim}. Se o INSS ou a Receita já publicaram as novas, o resultado está defasado: confira o holerite.`:`De janeiro em diante, o INSS costuma publicar faixas novas e o imposto de renda pode mudar por lei. Confira se as tabelas foram atualizadas antes de usar o resultado para o ano seguinte.`}</p>
 </div>
}

function Resumo({r}){
 const {inss,irrf}=r;
 const semImposto=irrf.valor===0;
 return <Resultado label="Salário líquido do mês" valor={moeda(r.liquido)} metrics={[['INSS',moeda(inss.valor),'blue'],['Imposto de renda',moeda(irrf.valor),'orange']]}>
  <p>De {moeda(r.bruto)} brutos, {pct(r.descontos/r.bruto)} vão em descontos{r.outrosDescontos>0?` (${moeda(r.outrosDescontos)} em outros descontos)`:''}. {inss.noTeto?`O INSS está no teto: ${moeda(inss.valor)}, o máximo de 2026.`:`O INSS é ${pct(inss.aliquotaEfetiva)} do bruto, porque cada alíquota só vale na sua faixa.`} {semImposto?(irrf.reducao>0?`O imposto de renda pela tabela seria ${moeda(irrf.impostoPelaTabela)}, zerado pela redução da Lei 15.270/2025.`:'A base de cálculo fica na faixa isenta: sem imposto de renda.'):`O imposto de renda fica em ${pct(irrf.aliquotaEfetiva)} do bruto${irrf.reducao>0?`, já com ${moeda(irrf.reducao)} de redução da Lei 15.270/2025`:''}.`}</p>
 </Resultado>
}

// `r` precisa de bruto, inss (e, no caminho do imposto, irrf e dependentes); o 13º passa o valor do 13º como bruto.
export function TabelaDoInss({r}){
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>INSS faixa a faixa</h2><p>A alíquota de cada faixa só sobre a parte do salário que cai nela.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Faixa (até)</th><th>Alíquota</th><th>Parte do salário na faixa</th><th>Desconto</th></tr></thead><tbody>
   {r.inss.faixas.map(f=><tr key={f.ate}><td>{moeda(f.ate)}</td><td>{pct(f.aliquota)}</td><td>{moeda(f.base)}</td><td>{moeda(f.valor)}</td></tr>)}
   <tr><td><strong>Total</strong></td><td>{pct(r.inss.aliquotaEfetiva)} efetiva</td><td>{moeda(Math.min(r.bruto,INSS_2026.teto))}</td><td><strong>{moeda(r.inss.valor)}</strong></td></tr>
  </tbody></table></div>
 </section>
}

export function CaminhoDoImposto({r,rotuloFinal='Imposto de renda do mês'}){
 const {irrf}=r;
 const linhas=[
  ['Deduções legais (INSS'+(r.dependentes>0?` + ${r.dependentes} × ${moeda(IRRF_2026.dependente)}`:'')+')',moeda(r.bruto-irrf.baseLegal),irrf.modo==='legal'?'usada':''],
  ['Desconto simplificado',moeda(IRRF_2026.simplificado),irrf.modo==='simplificado'?'usado':''],
  ['Base de cálculo',moeda(irrf.base),irrf.aliquota>0?`faixa de ${pct(irrf.aliquota)}`:'faixa isenta'],
  ['Imposto pela tabela',moeda(irrf.impostoPelaTabela),irrf.aliquota>0?`${pct(irrf.aliquota)} × base − ${moeda(irrf.parcelaADeduzir)}`:''],
  ['Redução da Lei 15.270/2025',irrf.reducao>0?'− '+moeda(irrf.reducao):moeda(0),r.bruto>IRRF_2026.reducao.limite?`só até ${moeda(IRRF_2026.reducao.limite)} de salário`:''],
  [rotuloFinal,moeda(irrf.valor),`${pct(irrf.aliquotaEfetiva)} do bruto`],
 ];
 return <section className="panel chart-panel"><div className="chart-head"><div><h2>O caminho do imposto de renda</h2><p>Da dedução escolhida ao valor retido.</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Etapa</th><th>Valor</th><th>Como</th></tr></thead><tbody>
   {linhas.map(([etapa,valor,como])=><tr key={etapa}><td>{etapa}</td><td>{valor}</td><td>{como}</td></tr>)}
  </tbody></table></div>
 </section>
}
