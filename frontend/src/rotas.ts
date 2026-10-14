import { useEffect, useState } from 'react';

// Rotas simples usando o "#" do endereço: #/mapa, #/licao/ola-byte...
export function useRota(): string[] {
  const ler = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const f = () => {
      setRota(ler());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return rota;
}

export function ir(caminho: string) {
  window.location.hash = '#/' + caminho;
}
