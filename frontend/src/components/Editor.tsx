// O editor de código (CodeMirror) com cores, autocompletar em português e marcação de linhas.
import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { EditorView, Decoration, type DecorationSet, keymap } from '@codemirror/view';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { java } from '@codemirror/lang-java';
import { indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, indentUnit } from '@codemirror/language';
import { coresJava } from './cores';
import { setDiagnostics, lintGutter, type Diagnostic } from '@codemirror/lint';
import {
  autocompletion, snippetCompletion, type Completion, type CompletionContext, type CompletionResult,
} from '@codemirror/autocomplete';

export type MarcaErro = { linha: number; coluna?: number; mensagem: string };

const COMANDOS_ROBO: Completion[] = [
  { label: 'andar', apply: 'andar();', detail: 'anda 1 quadradinho', type: 'method' },
  { label: 'virarDireita', apply: 'virarDireita();', detail: 'gira para a direita', type: 'method' },
  { label: 'virarEsquerda', apply: 'virarEsquerda();', detail: 'gira para a esquerda', type: 'method' },
  { label: 'pegarMoeda', apply: 'pegarMoeda();', detail: 'pega a moeda embaixo', type: 'method' },
  snippetCompletion('falar("${texto}");', { label: 'falar', detail: 'fala num balão', type: 'method' }),
  { label: 'temMoeda', apply: 'temMoeda()', detail: 'tem moeda aqui? (true/false)', type: 'function' },
  { label: 'frenteLivre', apply: 'frenteLivre()', detail: 'a frente está livre?', type: 'function' },
  { label: 'esquerdaLivre', apply: 'esquerdaLivre()', detail: 'a esquerda está livre?', type: 'function' },
  { label: 'direitaLivre', apply: 'direitaLivre()', detail: 'a direita está livre?', type: 'function' },
  { label: 'chegou', apply: 'chegou()', detail: 'está na bandeira?', type: 'function' },
  { label: 'getMoedas', apply: 'getMoedas()', detail: 'quantas moedas pegou', type: 'function' },
  { label: 'getNome', apply: 'getNome()', detail: 'o nome do robô', type: 'function' },
];

const OUTROS_METODOS: Completion[] = [
  { label: 'add', apply: 'add(', detail: 'coloca na lista', type: 'method' },
  { label: 'get', apply: 'get(', detail: 'pega da lista', type: 'method' },
  { label: 'size', apply: 'size()', detail: 'tamanho da lista', type: 'method' },
  { label: 'length', detail: 'tamanho do array', type: 'property' },
  { label: 'equals', apply: 'equals(', detail: 'compara textos', type: 'method' },
];

const PALAVRAS: Completion[] = [
  snippetCompletion('for (int i = 0; i < ${3}; i++) {\n\t${}\n}', { label: 'for', detail: 'repetir N vezes', type: 'keyword' }),
  snippetCompletion('while (${!robo.chegou()}) {\n\t${}\n}', { label: 'while', detail: 'repetir enquanto...', type: 'keyword' }),
  snippetCompletion('if (${robo.temMoeda()}) {\n\t${}\n}', { label: 'if', detail: 'se...', type: 'keyword' }),
  snippetCompletion('else {\n\t${}\n}', { label: 'else', detail: 'senão...', type: 'keyword' }),
  snippetCompletion('System.out.println(${"Olá!"});', { label: 'System.out.println', detail: 'escreve no terminal', type: 'function' }),
  snippetCompletion('int ${nome} = ${0};', { label: 'int', detail: 'caixinha de número', type: 'type' }),
  snippetCompletion('String ${nome} = "${texto}";', { label: 'String', detail: 'caixinha de texto', type: 'type' }),
  snippetCompletion('static void ${nome}() {\n\t${}\n}', { label: 'static void', detail: 'criar um comando', type: 'keyword' }),
  { label: 'robo', detail: 'o seu robô', type: 'variable' },
  { label: 'true', type: 'keyword' },
  { label: 'false', type: 'keyword' },
  { label: 'return', type: 'keyword' },
  { label: 'new', type: 'keyword' },
];

function completar(ctx: CompletionContext): CompletionResult | null {
  const membro = ctx.matchBefore(/[\w.]+\.\w*$/);
  if (membro) {
    const ponto = membro.text.lastIndexOf('.');
    const antes = membro.text.slice(0, ponto);
    const from = membro.from + ponto + 1;
    if (antes === 'System') return { from, options: [{ label: 'out', type: 'property' }] };
    if (antes === 'System.out') {
      return { from, options: [snippetCompletion('println(${});', { label: 'println', detail: 'escreve uma linha', type: 'method' })] };
    }
    return { from, options: [...COMANDOS_ROBO, ...OUTROS_METODOS], validFor: /^\w*$/ };
  }
  const palavra = ctx.matchBefore(/\w+$/);
  if (!palavra && !ctx.explicit) return null;
  return { from: palavra ? palavra.from : ctx.pos, options: PALAVRAS, validFor: /^\w*$/ };
}

const marcarLinhas = StateEffect.define<{ atual: number | null; erro: number | null }>();

const campoLinhas = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decos, tr) {
    decos = decos.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(marcarLinhas)) {
        const lista = [];
        const doc = tr.state.doc;
        const { atual, erro } = e.value;
        if (erro && erro <= doc.lines) lista.push(Decoration.line({ class: 'cm-linha-erro' }).range(doc.line(erro).from));
        if (atual && atual <= doc.lines && atual !== erro) {
          lista.push(Decoration.line({ class: 'cm-linha-atual' }).range(doc.line(atual).from));
        }
        lista.sort((a, b) => a.from - b.from);
        decos = Decoration.set(lista);
      }
    }
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const tema = EditorView.theme({
  '&': { fontSize: '16px', height: '100%' },
  '.cm-scroller': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', lineHeight: '1.6' },
  '.cm-content': { padding: '10px 0' },
  '.cm-gutters': { border: 'none' },
});

export function Editor({ valor, onChange, linhaAtual, erroLinha, erros }: {
  valor: string;
  onChange: (v: string) => void;
  linhaAtual: number | null;
  erroLinha: number | null;
  erros: MarcaErro[];
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const aoMudar = useRef(onChange);
  aoMudar.current = onChange;

  useEffect(() => {
    const v = new EditorView({
      parent: caixa.current!,
      state: EditorState.create({
        doc: valor,
        extensions: [
          basicSetup,
          java(),
          indentUnit.of('    '),
          EditorState.tabSize.of(4),
          keymap.of([indentWithTab]),
          syntaxHighlighting(coresJava),
          autocompletion({ override: [completar], icons: false }),
          lintGutter(),
          campoLinhas,
          tema,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'Editor de código Java', spellcheck: 'false' }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) aoMudar.current(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // O editor é criado uma vez só; mudanças de valor vêm pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== valor) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: valor } });
    }
  }, [valor]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const efeitos: StateEffect<unknown>[] = [marcarLinhas.of({ atual: linhaAtual, erro: erroLinha })];
    const alvo = linhaAtual ?? erroLinha;
    if (alvo && alvo <= v.state.doc.lines) {
      efeitos.push(EditorView.scrollIntoView(v.state.doc.line(alvo).from, { y: 'nearest' }));
    }
    v.dispatch({ effects: efeitos });
  }, [linhaAtual, erroLinha]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const doc = v.state.doc;
    const diags: Diagnostic[] = erros
      .filter((e) => e.linha >= 1 && e.linha <= doc.lines)
      .map((e) => {
        const l = doc.line(e.linha);
        const from = Math.min(l.from + Math.max(0, (e.coluna ?? 1) - 1), l.to);
        return { from, to: Math.max(from, l.to), severity: 'error', message: e.mensagem };
      });
    v.dispatch(setDiagnostics(v.state, diags));
  }, [erros]);

  return <div className="editor" ref={caixa} />;
}
