// Tipos e chamadas para o servidor do JavaQuest.

export type Objetivo = {
  tipo: 'chegar' | 'moedas' | 'falar' | 'imprimir' | 'robos';
  texto?: string;
  quantidade?: number;
};

export type MundoDef = { mapa: string[]; direcao: string; objetivos: Objetivo[] };

export type PedidoDef = {
  metodo: string;
  caminho: string;
  corpo?: unknown;
  esperado?: string;
  esperadoJson?: unknown;
  status?: number;
};

export type Licao = {
  id: string;
  titulo: string;
  tipo: 'mapa' | 'loja' | 'terminal';
  modo: 'corpo' | 'completo';
  historia: string;
  explicacao: string;
  dica: string;
  codigoInicial: string;
  solucao: string;
  mundos: MundoDef[];
  pedidos: PedidoDef[];
  desafio: boolean;
  livre: boolean;
};

export type Modulo = {
  id: string;
  titulo: string;
  emoji: string;
  cor: string;
  descricao: string;
  oculto: boolean;
  licoes: Licao[];
};

export type Evento = {
  tipo: string;
  linha?: number;
  robo?: number;
  x?: number;
  y?: number;
  dir?: string;
  nome?: string;
  cor?: string;
  texto?: string;
  total?: number;
  metodo?: string;
  caminho?: string;
  corpo?: string;
  status?: number;
  resposta?: string;
  esperado?: string;
  statusEsperado?: number;
  ok?: boolean;
  atendente?: string;
};

export type ResultadoMundo = {
  eventos: Evento[];
  objetivos: { tipo: string; ok: boolean }[];
  sucesso: boolean;
  erro?: { mensagem: string; linha?: number };
};

export type ErroCompilacao = { linha: number; coluna: number; mensagem: string; original: string };

export type Resultado = {
  status: 'sucesso' | 'quase' | 'falhou' | 'erroCompilacao' | 'bloqueado' | 'tempoEsgotado' | 'ocupado' | 'erroInterno';
  mensagem: string;
  erros: ErroCompilacao[];
  mundos: ResultadoMundo[];
};

let cache: Promise<Modulo[]> | null = null;

export function carregarModulos(): Promise<Modulo[]> {
  if (!cache) {
    cache = fetch('/api/modulos').then((r) => {
      if (!r.ok) throw new Error('Não consegui falar com o servidor.');
      return r.json();
    });
    cache.catch(() => (cache = null));
  }
  return cache;
}

export async function executar(licao: string, codigo: string): Promise<Resultado> {
  try {
    const r = await fetch('/api/executar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licao, codigo }),
    });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } catch {
    return {
      status: 'erroInterno',
      mensagem: 'Não consegui falar com o servidor do JavaQuest. Ele está ligado? Confira a internet e tente de novo.',
      erros: [],
      mundos: [],
    };
  }
}

export function descreverObjetivo(o: Objetivo): string {
  switch (o.tipo) {
    case 'chegar': return 'Chegar na bandeira 🚩';
    case 'moedas': return 'Pegar todas as moedas 🪙';
    case 'falar': return `O robô deve falar: "${o.texto}"`;
    case 'imprimir': return `Escrever no terminal: "${o.texto}"`;
    case 'robos': return `Criar ${o.quantidade ?? 1} robôs 🤖`;
    default: return o.tipo;
  }
}
