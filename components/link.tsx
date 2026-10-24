import type {AnchorHTMLAttributes} from 'react';

// As páginas são independentes. Links nativos evitam a navegação RSC do
// empacotamento standalone e mantêm abrir em nova aba e navegação sem JavaScript.
export default function Link(props:AnchorHTMLAttributes<HTMLAnchorElement>){
  return <a {...props}/>;
}
