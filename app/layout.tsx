import type { Metadata } from "next";
import "../styles/calcula.css";
import "../styles/identidade.css";
import { Header, Footer } from "../components/estrutura";
import {metadataPagina,metadataAds} from '../lib/seo';
import {PublicidadeProvider} from '../components/publicidade';

export async function generateMetadata():Promise<Metadata>{return {
  ...await metadataPagina('Calculadoras para o dinheiro do dia a dia','Calculadoras de juros compostos, porcentagem, compras, metas, inflação e moedas. Contas claras para o dinheiro do dia a dia.','/'),
  title: {default:"Calcula Dinheiro — entenda a conta",template:"%s | Calcula Dinheiro"},
  other: metadataAds(),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
}}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body><PublicidadeProvider><Header/><main id="conteudo">{children}</main><Footer/></PublicidadeProvider></body>
    </html>
  );
}
