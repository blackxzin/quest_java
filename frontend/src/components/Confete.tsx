// Chuva de confete para comemorar uma missão cumprida.
import { useMemo } from 'react';

const CORES = ['#7c5cff', '#ffc83d', '#ff6b9d', '#00b894', '#4f8cff', '#ff9f43'];

export function Confete() {
  const pedacos = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        esquerda: Math.random() * 100,
        atraso: Math.random() * 0.8,
        duracao: 2.2 + Math.random() * 1.6,
        cor: CORES[i % CORES.length],
        tamanho: 6 + Math.random() * 8,
        giro: Math.random() * 360,
        redondo: Math.random() > 0.6,
      })),
    [],
  );
  return (
    <div className="confete" aria-hidden="true">
      {pedacos.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.esquerda}%`,
            animationDelay: `${p.atraso}s`,
            animationDuration: `${p.duracao}s`,
            background: p.cor,
            width: p.tamanho,
            height: p.redondo ? p.tamanho : p.tamanho * 0.45,
            borderRadius: p.redondo ? '50%' : 2,
            transform: `rotate(${p.giro}deg)`,
          }}
        />
      ))}
    </div>
  );
}
