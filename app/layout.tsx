import type { Metadata } from "next";
import "../styles/calcula.css";
import "../styles/identidade.css";
import { Header, Footer } from "../components/estrutura";
import {metadataPagina,metadataAds} from '../lib/seo';
import {PublicidadeProvider} from '../components/publicidade';
import config from '../config/publicacao.json';
import {beaconWebAnalytics} from '../lib/publicacao.mjs';

export async function generateMetadata():Promise<Metadata>{return {
  ...await metadataPagina('Calculadoras para o dinheiro do dia a dia','Calculadoras de juros compostos, porcentagem, compras, metas, inflação e moedas. Contas claras para o dinheiro do dia a dia.','/'),
  title: {default:"Calcula Dinheiro — entenda a conta",template:"%s | Calcula Dinheiro"},
  other: metadataAds(),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
}}

const beacon=beaconWebAnalytics(config.webAnalytics?.token);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body><PublicidadeProvider><Header/><main id="conteudo">{children}</main><Footer/></PublicidadeProvider>{beacon&&<script defer src={beacon.src} data-cf-beacon={beacon.dados}></script>}</body>
    </html>
  );
}
