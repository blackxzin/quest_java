// As mesmas cores de código para o editor e para os exemplos das lições.
import { tagHighlighter, tags as t } from '@lezer/highlight';

export const coresJava = tagHighlighter([
  { tag: [t.keyword, t.modifier, t.controlKeyword, t.definitionKeyword, t.operatorKeyword, t.bool, t.null, t.self], class: 'tok-keyword' },
  { tag: [t.string, t.character], class: 'tok-string' },
  { tag: [t.number, t.integer, t.float], class: 'tok-number' },
  { tag: [t.comment, t.lineComment, t.blockComment], class: 'tok-comment' },
  { tag: [t.typeName, t.className, t.namespace], class: 'tok-typeName' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], class: 'tok-function' },
  { tag: [t.annotation, t.meta], class: 'tok-annotation' },
]);
