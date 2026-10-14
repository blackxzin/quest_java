// O Byte, mascote do JavaQuest, desenhado em SVG.
import { useId } from 'react';

export type Humor = 'feliz' | 'triste' | 'pensando' | 'festa';

const CORES: Record<string, string> = {
  azul: '#4f8cff',
  vermelho: '#ff5c5c',
  verde: '#2ecc71',
  amarelo: '#ffc83d',
  roxo: '#9b6bff',
  rosa: '#ff7eb6',
  laranja: '#ff9f43',
};

export function corDoRobo(nome?: string) {
  return CORES[nome ?? 'azul'] ?? CORES.azul;
}

export function Byte({ humor = 'feliz', tamanho = 120, cor = 'azul', acenando = false }: {
  humor?: Humor;
  tamanho?: number;
  cor?: string;
  acenando?: boolean;
}) {
  const c = corDoRobo(cor);
  const brilho = 'brilho' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const boca =
    humor === 'triste' ? 'M42 70 Q50 63 58 70' :
    humor === 'pensando' ? 'M43 68 L57 68' :
    humor === 'festa' ? 'M40 64 Q50 78 60 64 Z' :
    'M41 65 Q50 74 59 65';
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" role="img" aria-label="Byte, o robô" className="byte">
      <line x1="50" y1="22" x2="50" y2="10" stroke="#5a5780" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="9" r="5" fill={humor === 'triste' ? '#9aa0b5' : '#ffc83d'} className="byte-antena" />
      <rect x="14" y="44" width="10" height="20" rx="5" fill={c} opacity="0.85"
        className={acenando ? 'byte-braco-acenando' : undefined} />
      <rect x="76" y="44" width="10" height="20" rx="5" fill={c} opacity="0.85" />
      <rect x="20" y="22" width="60" height="62" rx="18" fill={c} />
      <rect x="20" y="22" width="60" height="62" rx="18" fill={`url(#${brilho})`} />
      <rect x="28" y="32" width="44" height="42" rx="12" fill="#ffffff" />
      {humor === 'festa' ? (
        <>
          <path d="M34 50 Q39 43 44 50" stroke="#2d2a4a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M56 50 Q61 43 66 50" stroke="#2d2a4a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="39" cy={humor === 'pensando' ? 47 : 50} rx="4.5" ry={humor === 'triste' ? 4 : 6} fill="#2d2a4a" className="byte-olho" />
          <ellipse cx="61" cy={humor === 'pensando' ? 47 : 50} rx="4.5" ry={humor === 'triste' ? 4 : 6} fill="#2d2a4a" className="byte-olho" />
          <circle cx="40.5" cy={humor === 'pensando' ? 45 : 48} r="1.5" fill="#fff" />
          <circle cx="62.5" cy={humor === 'pensando' ? 45 : 48} r="1.5" fill="#fff" />
        </>
      )}
      <circle cx="33" cy="61" r="3.5" fill="#ff9ec4" opacity="0.7" />
      <circle cx="67" cy="61" r="3.5" fill="#ff9ec4" opacity="0.7" />
      <path d={boca} stroke="#2d2a4a" strokeWidth="3" fill={humor === 'festa' ? '#ff6b8a' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="30" y="86" width="14" height="8" rx="4" fill="#5a5780" />
      <rect x="56" y="86" width="14" height="8" rx="4" fill="#5a5780" />
      <defs>
        <linearGradient id={brilho} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
