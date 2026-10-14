// O progresso do aluno fica guardado no próprio navegador.

export type ProgressoLicao = { estrelas: number; concluida: boolean; codigo?: string; dica?: boolean; solucao?: boolean };
type Progresso = { licoes: Record<string, ProgressoLicao>; tudoLiberado?: boolean };

const CHAVE = 'javaquest:progresso:v1';

function ler(): Progresso {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return JSON.parse(bruto);
  } catch {
    // Sem localStorage (janela anônima, por exemplo): começa do zero.
  }
  return { licoes: {} };
}

let estado: Progresso = ler();
const ouvintes = new Set<() => void>();

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    // Tudo bem: o progresso vale só nesta visita.
  }
  ouvintes.forEach((f) => f());
}

export function ouvirProgresso(f: () => void) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

export function progressoDe(id: string): ProgressoLicao {
  return estado.licoes[id] ?? { estrelas: 0, concluida: false };
}

function atualizar(id: string, mudanca: Partial<ProgressoLicao>) {
  estado = { ...estado, licoes: { ...estado.licoes, [id]: { ...progressoDe(id), ...mudanca } } };
  salvar();
}

export function guardarCodigo(id: string, codigo: string) {
  estado.licoes[id] = { ...progressoDe(id), codigo };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    // ignorado
  }
}

export function marcarDica(id: string) {
  atualizar(id, { dica: true });
}

export function marcarSolucao(id: string) {
  atualizar(id, { solucao: true });
}

/** 3 estrelas sem ajuda, 2 com dica, 1 olhando a solução. Guarda sempre a melhor. */
export function concluir(id: string): number {
  const p = progressoDe(id);
  const estrelas = p.solucao ? 1 : p.dica ? 2 : 3;
  atualizar(id, { concluida: true, estrelas: Math.max(estrelas, p.estrelas) });
  return estrelas;
}

export function tudoLiberado() {
  return !!estado.tudoLiberado;
}

export function liberarTudo(valor: boolean) {
  estado = { ...estado, tudoLiberado: valor };
  salvar();
}

export function totalEstrelas() {
  return Object.values(estado.licoes).reduce((s, l) => s + (l.estrelas || 0), 0);
}
