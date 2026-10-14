// Componente React em volta do MotorPalco (o canvas do mapa).
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { Evento, MundoDef } from '../api';
import { MotorPalco, type Callbacks } from '../game/palco';

export type ControlePalco = {
  tocar: (mundo: MundoDef, eventos: Evento[], velocidade: number, cb: Callbacks) => void;
  pular: () => void;
  parar: () => void;
  velocidade: (v: number) => void;
};

export function Palco({ mundo, ref }: { mundo: MundoDef; ref: Ref<ControlePalco> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const motor = useRef<MotorPalco | null>(null);

  useEffect(() => {
    const m = new MotorPalco(canvas.current!);
    motor.current = m;
    const obs = new ResizeObserver(([e]) => m.redimensionar(e.contentRect.width));
    obs.observe(caixa.current!);
    return () => {
      obs.disconnect();
      m.destruir();
    };
  }, []);

  useEffect(() => {
    motor.current?.definirMundo(mundo);
  }, [mundo]);

  useImperativeHandle(ref, () => ({
    tocar: (m, eventos, velocidade, cb) => {
      motor.current?.definirMundo(m);
      motor.current?.tocar(eventos, velocidade, cb);
    },
    pular: () => motor.current?.pular(),
    parar: () => motor.current?.parar(),
    velocidade: (v) => motor.current?.mudarVelocidade(v),
  }));

  return (
    <div className="palco" ref={caixa}>
      <canvas ref={canvas} role="img" aria-label="Mapa do jogo com o robô" />
    </div>
  );
}
