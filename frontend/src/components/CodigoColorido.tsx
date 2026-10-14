// Mostra um trecho de código Java colorido (com as mesmas cores do editor).
import { useMemo, type ReactNode } from 'react';
import { javaLanguage } from '@codemirror/lang-java';
import { highlightCode } from '@lezer/highlight';
import { coresJava } from './cores';

export function CodigoColorido({ codigo, java = true }: { codigo: string; java?: boolean }) {
  const partes = useMemo(() => {
    if (!java) return [codigo];
    const nos: ReactNode[] = [];
    let k = 0;
    highlightCode(
      codigo,
      javaLanguage.parser.parse(codigo),
      coresJava,
      (texto, classes) => nos.push(classes ? <span key={k++} className={classes}>{texto}</span> : texto),
      () => nos.push('\n'),
    );
    return nos;
  }, [codigo, java]);
  return <pre className="codigo"><code>{partes}</code></pre>;
}
