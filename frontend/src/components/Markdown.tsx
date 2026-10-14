// Um mini leitor de Markdown para os textos das lições (parágrafos, listas, **negrito**, `código` e blocos de código).
import { Fragment, type ReactNode } from 'react';
import { CodigoColorido } from './CodigoColorido';

function inline(texto: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const t = m[0];
    if (t.startsWith('`')) partes.push(<code key={i++}>{t.slice(1, -1)}</code>);
    else if (t.startsWith('**')) partes.push(<strong key={i++}>{t.slice(2, -2)}</strong>);
    else partes.push(<em key={i++}>{t.slice(1, -1)}</em>);
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

export function Markdown({ texto }: { texto: string }) {
  const linhas = (texto ?? '').replace(/\r/g, '').split('\n');
  const blocos: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    if (linha.startsWith('```')) {
      const lang = linha.slice(3).trim();
      const codigo: string[] = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith('```')) codigo.push(linhas[i++]);
      i++;
      blocos.push(<CodigoColorido key={k++} codigo={codigo.join('\n')} java={lang === 'java'} />);
    } else if (/^\s*[-*] /.test(linha)) {
      const itens: string[] = [];
      while (i < linhas.length && /^\s*[-*] /.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*[-*] /, ''));
      blocos.push(<ul key={k++}>{itens.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>);
    } else if (/^\s*\d+\. /.test(linha)) {
      const itens: string[] = [];
      while (i < linhas.length && /^\s*\d+\. /.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*\d+\. /, ''));
      blocos.push(<ol key={k++}>{itens.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>);
    } else if (linha.startsWith('### ')) {
      blocos.push(<h4 key={k++}>{inline(linha.slice(4))}</h4>);
      i++;
    } else if (linha.trim() === '') {
      i++;
    } else {
      const par: string[] = [];
      while (i < linhas.length && linhas[i].trim() !== '' && !/^(```|\s*[-*] |\s*\d+\. |### )/.test(linhas[i])) par.push(linhas[i++]);
      blocos.push(<p key={k++}>{par.map((l, j) => <Fragment key={j}>{j > 0 && ' '}{inline(l)}</Fragment>)}</p>);
    }
  }
  return <div className="markdown">{blocos}</div>;
}
