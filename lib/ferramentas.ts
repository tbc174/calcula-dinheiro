export const ferramentas = [
 {slug:'juros-compostos',titulo:'Juros compostos',chamada:'Cada valor faz diferença.',descricao:'Veja quanto você pode acumular e de onde vem cada parte do saldo.',categoria:'Guardar e planejar',icone:'juros'},
 {slug:'porcentagem',titulo:'Porcentagem',chamada:'A conta fica mais clara.',descricao:'Calcule descontos, aumentos, proporções e variações sem complicação.',categoria:'Comprar e comparar',icone:'porcentagem'},
 {slug:'a-vista-ou-parcelado',titulo:'À vista ou parcelado',chamada:'Compare antes de escolher.',descricao:'Descubra o total de cada opção, incluindo entrada e parcelas.',categoria:'Comprar e comparar',icone:'parcelas'},
 {slug:'financiamento',titulo:'Financiamento: SAC ou Price',chamada:'Veja a parcela antes de assinar.',descricao:'Compare SAC e Price: primeira e última parcela, juros totais e o efeito de amortizar antes.',categoria:'Comprar e comparar',icone:'financiamento'},
 {slug:'emprestimo',titulo:'Empréstimo: parcela, juros e CET',chamada:'A taxa não é o custo todo.',descricao:'Parcela pela Price, juros no total e o CET com IOF e tarifa; o mesmo empréstimo em outros prazos, lado a lado.',categoria:'Comprar e comparar',icone:'emprestimo'},
 {slug:'quanto-rende',titulo:'Quanto rende',chamada:'Compare o que sobra no fim.',descricao:'Poupança, CDB, LCI ou LCA e Tesouro Selic no mesmo prazo, já com IOF, imposto de renda e custódia.',categoria:'Guardar e planejar',icone:'quanto-rende'},
 {slug:'quanto-guardar-por-mes',titulo:'Quanto guardar por mês',chamada:'Dê um plano à sua meta.',descricao:'Descubra quanto separar por mês para chegar ao valor que você quer.',categoria:'Guardar e planejar',icone:'meta'},
 {slug:'salario-liquido',titulo:'Salário líquido',chamada:'O que cai na conta, desconto por desconto.',descricao:'Do bruto ao líquido com as tabelas de 2026: INSS por faixa, imposto de renda com dependentes ou desconto simplificado e a redução para quem ganha até R$ 7.350.',categoria:'Entender os valores',icone:'salario'},
 {slug:'decimo-terceiro',titulo:'13º salário',chamada:'Quanto cai em novembro e em dezembro.',descricao:'13º integral ou proporcional pela regra dos 15 dias, a 1ª parcela sem desconto e a 2ª com o INSS e o imposto de renda de 2026 sobre o 13º inteiro.',categoria:'Entender os valores',icone:'decimo-terceiro'},
 {slug:'rescisao',titulo:'Rescisão',chamada:'O que entra no acerto quando o contrato acaba.',descricao:'Saldo de salário, aviso prévio, 13º e férias proporcionais, os descontos de 2026 e a multa do FGTS, por tipo de desligamento: sem justa causa, pedido de demissão, acordo ou justa causa.',categoria:'Entender os valores',icone:'rescisao'},
 {slug:'ferias',titulo:'Férias',chamada:'Quanto cai na conta antes de sair de férias.',descricao:'Férias com um terço, venda de até 10 dias (abono pecuniário), adiantamento do 13º, INSS e imposto de renda de 2026 calculados em separado, e até quando a empresa deve pagar.',categoria:'Entender os valores',icone:'ferias'},
 {slug:'cartao-rotativo',titulo:'Rotativo do cartão',chamada:'O que custa não pagar a fatura inteira.',descricao:'Juros e IOF de um mês de rotativo, o parcelamento da fatura mês a mês com o teto de 100% da Lei 14.690/2023 e a comparação com um empréstimo pessoal.',categoria:'Comprar e comparar',icone:'cartao'},
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
