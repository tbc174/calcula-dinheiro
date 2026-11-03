'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import config from '../config/publicacao.json';
import {anunciosProntos,publicarHost,normalizarPublisher,publicidadeRecusada,slotDe} from '../lib/publicacao.mjs';
const Contexto=createContext({permitido:false,abrir:()=>{}});
const chave='cd-publicidade-v1';
function lerEscolha(){try{return JSON.parse(localStorage.getItem(chave)||'null')}catch{return null}}
function scriptUnico(id,src){let s=document.getElementById(id);if(!s){s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.crossOrigin='anonymous';document.head.appendChild(s)}return s}
// O adsbygoogle.js também traz os anúncios automáticos do painel (âncora, vinheta) e, para visitantes do EEE, Reino Unido
// e Suíça, a mensagem de consentimento do Google publicada no AdSense.
function carregarAdsense(){return scriptUnico('cd-adsense','https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+normalizarPublisher(config.adsense.publisherId))}
export function PublicidadeProvider({children}){
 const [aberto,setAberto]=useState(false),[ativo,setAtivo]=useState(false),[recusada,setRecusada]=useState(false),[permitido,setPermitido]=useState(false);const dialog=useRef(null);
// eslint-disable-next-line react-hooks/set-state-in-effect -- host e recusa guardada só existem no navegador (evita divergência na hidratação)
 useEffect(()=>{const habilitado=anunciosProntos(config.adsense)&&publicarHost(location.host,config.origem);const r=publicidadeRecusada(lerEscolha());setAtivo(habilitado);setRecusada(r);if(habilitado&&!r){carregarAdsense();setPermitido(true)}},[]);
 useEffect(()=>{const el=dialog.current;if(!el)return;if(aberto&&!el.open)el.showModal();else if(!aberto&&el.open)el.close()},[aberto]);
 useEffect(()=>{const atualizar=e=>{if(e.key===chave)location.reload()};window.addEventListener('storage',atualizar);return()=>window.removeEventListener('storage',atualizar)},[]);
 // Recarrega só quando a escolha muda: recusar tira o AdSense já carregado; permitir de novo volta a carregá-lo.
 function salvar(publicidade){const c={versao:1,publicidade,expira:Date.now()+180*86400000};try{localStorage.setItem(chave,JSON.stringify(c))}catch{}setAberto(false);if(publicidade===recusada)location.reload()}
 function cookiesGoogle(){setAberto(false);window.googlefc?.showRevocationMessage?.()}
 return <Contexto.Provider value={{permitido,abrir:()=>setAberto(true)}}>{children}<dialog ref={dialog} className="privacidade-dialog" aria-labelledby="preferencias-titulo" onCancel={()=>setAberto(false)} onClose={()=>setAberto(false)}><div className="eyebrow">Você escolhe</div><h2 id="preferencias-titulo">Preferências de privacidade</h2>{ativo?<><p>O site exibe anúncios do Google AdSense para manter as calculadoras gratuitas. O Google pode usar cookies, identificadores do navegador, endereço IP e dados de uso para entregar e medir os anúncios.</p><p>{recusada?'Você recusou a publicidade neste navegador. As calculadoras funcionam normalmente.':'Se preferir, recuse a publicidade: a escolha fica salva neste navegador por até 180 dias e as calculadoras continuam funcionando.'}</p><div className="privacy-actions">{recusada?<button className="secondary" onClick={()=>salvar(true)}>Permitir publicidade</button>:<button className="secondary" onClick={()=>salvar(false)}>Recusar publicidade</button>}{typeof window!=='undefined'&&window.googlefc?.showRevocationMessage&&<button className="secondary" onClick={cookiesGoogle}>Escolhas de cookies do Google</button>}</div></>:<><p>Os anúncios estão desligados nesta versão. O site salva apenas preferências que você escolhe, como o tema claro ou escuro. Não usamos análise de audiência.</p><button className="secondary" onClick={()=>setAberto(false)}>Fechar</button></>}<p className="source"><Link href="/privacidade">Leia a política de privacidade</Link>. Você pode voltar a estas preferências pelo rodapé.</p></dialog></Contexto.Provider>
}
export function PreferenciasPublicidade(){const {abrir}=useContext(Contexto);return <button className="text-button" onClick={abrir}>Preferências de privacidade</button>}
export function EspacoPublicidade({posicao='rodape'}){const {permitido}=useContext(Contexto);const caminho=usePathname();return permitido?<BlocoAnuncio key={caminho} slot={slotDe(config.adsense,posicao)}/>:null}
function BlocoAnuncio({slot}){const el=useRef(null);useEffect(()=>{let cancelado=false;const s=carregarAdsense();const iniciar=()=>{if(cancelado||!el.current||el.current.dataset.adsbygoogleStatus)return;try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch{}};s.addEventListener('load',iniciar);if(window.adsbygoogle?.loaded)iniciar();return()=>{cancelado=true;s.removeEventListener('load',iniciar)}},[]);return <aside className="publicidade" aria-label="Publicidade"><small>Publicidade</small><ins ref={el} className="adsbygoogle" style={{display:'block'}} data-ad-client={normalizarPublisher(config.adsense.publisherId)} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/></aside>}
