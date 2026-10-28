import type { NextConfig } from "next";

// Metadados sempre dentro do <head>. Com `generateMetadata` o Next (e o vinext) adiam o título, a description e o
// canonical para o corpo da página ("streaming de metadados") em todo cliente que não esteja na lista de robôs
// limitados a HTML, e o Googlebot não está nessa lista. Em 28/10/2026 o Search Console mostrava canonical "Nenhum"
// por isso. Tratar todo cliente como limitado a HTML entrega os metadados no <head> (tests/site/metadados-no-head).
const nextConfig: NextConfig = { output: "standalone", htmlLimitedBots: /./ };
export default nextConfig;
