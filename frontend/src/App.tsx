import { useEffect, useState, useSyncExternalStore } from 'react';
import { carregarModulos, type Modulo } from './api';
import { Byte } from './components/Byte';
import { PaginaDicionario } from './pages/Dicionario';
import { PaginaInicio } from './pages/Inicio';
import { modulosOficina } from './laboratorio/catalogo';
import { PaginaOficina } from './pages/Oficina';
import { PaginaLicao } from './pages/Licao';
import { liberada, licoesEmOrdem, PaginaMapa } from './pages/Mapa';
import { ouvirProgresso, versaoProgresso } from './progresso';
import { ir, useRota } from './rotas';

export function App() {
  const rota = useRota();
  const [modulos, setModulos] = useState<Modulo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Redesenha as telas quando o progresso muda.
  useSyncExternalStore(ouvirProgresso, versaoProgresso);

  useEffect(() => {
    carregarModulos().then(m => setModulos([...m, ...modulosOficina])).catch((e) => setErro(String(e.message ?? e)));
  }, []);

  const [pagina, parametro] = rota;

  if (!pagina) return <PaginaInicio modulos={modulos} />;
  if (pagina === 'dicionario') return <PaginaDicionario />;

  if (erro) {
    return (
      <div className="carregando">
        <Byte humor="triste" tamanho={120} />
        <p>{erro}</p>
        <button className="botao" onClick={() => location.reload()}>Tentar de novo</button>
      </div>
    );
  }
  if (!modulos) {
    return (
      <div className="carregando">
        <Byte humor="pensando" tamanho={120} />
        <p>Carregando as missões...</p>
      </div>
    );
  }

  if (pagina === 'mapa') return <PaginaMapa modulos={modulos} />;

  const id = pagina === 'livre' ? 'livre' : pagina === 'licao' ? parametro : null;
  const modulo = modulos.find((m) => m.licoes.some((l) => l.id === id));
  const licao = modulo?.licoes.find((l) => l.id === id);
  if (!modulo || !licao) {
    return (
      <div className="carregando">
        <Byte humor="triste" tamanho={120} />
        <p>Ops! Essa página não existe.</p>
        <button className="botao" onClick={() => ir('mapa')}>Ir para o mapa</button>
      </div>
    );
  }
  if (!licao.livre && !liberada(modulos, licao.id)) {
    return (
      <div className="carregando">
        <Byte humor="pensando" tamanho={120} />
        <p>🔒 Esta missão ainda está trancada. Termine as anteriores primeiro!</p>
        <button className="botao" onClick={() => ir('mapa')}>Ir para o mapa</button>
      </div>
    );
  }
  const todas = licoesEmOrdem(modulos).filter(l => l.id.startsWith('git-') === licao.id.startsWith('git-') && l.id.startsWith('docker-') === licao.id.startsWith('docker-'));
  const i = todas.findIndex((l) => l.id === licao.id);
  const proxima = i >= 0 && i + 1 < todas.length ? todas[i + 1] : null;
  if (licao.tipo === 'terminal') return <PaginaOficina key={licao.id} modulo={modulo} licao={licao} proxima={proxima} />;
  return (
    <PaginaLicao
      key={licao.id}
      modulo={modulo}
      licao={licao}
      proxima={licao.livre ? null : proxima}
      posicao={{ atual: modulo.licoes.indexOf(licao) + 1, total: modulo.licoes.length }}
    />
  );
}
