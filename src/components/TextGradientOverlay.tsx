import React from 'react';
import { Square, ArrowDown, ArrowUp, ArrowRight, ArrowLeft, Sun, Moon, Sparkles } from 'lucide-react';

export type GradientDirection =
  | 'to-bottom' | 'to-top' | 'to-right' | 'to-left'
  | 'to-bottom-right' | 'to-bottom-left' | 'to-top-right' | 'to-top-left'
  | 'radial-center' | 'radial-bottom';

export interface GradientOverlayConfig {
  enabled: boolean;
  direction: GradientDirection;
  color: string;
  opacity: number; // 0-100
  heightPercent: number; // 0-100 (% da altura do canvas que o degradê ocupa)
  startPosition: 'top' | 'bottom' | 'center'; // onde fica o ponto "forte" do degradê
}

export const DEFAULT_OVERLAY: GradientOverlayConfig = {
  enabled: false,
  direction: 'to-bottom',
  color: '#000000',
  opacity: 70,
  heightPercent: 60,
  startPosition: 'bottom',
};

const DIRECTIONS: { value: GradientDirection; label: string; icon: any }[] = [
  { value: 'to-bottom', label: '↓ Topo→Base', icon: ArrowDown },
  { value: 'to-top', label: '↑ Base→Topo', icon: ArrowUp },
  { value: 'to-right', label: '→ Esquerda→Direita', icon: ArrowRight },
  { value: 'to-left', label: '← Direita→Esquerda', icon: ArrowLeft },
  { value: 'to-bottom-right', label: '↘ Diagonal ↘', icon: ArrowDown },
  { value: 'to-bottom-left', label: '↙ Diagonal ↙', icon: ArrowDown },
  { value: 'to-top-right', label: '↗ Diagonal ↗', icon: ArrowUp },
  { value: 'to-top-left', label: '↖ Diagonal ↖', icon: ArrowUp },
  { value: 'radial-center', label: '⊙ Radial Centro', icon: Sun },
  { value: 'radial-bottom', label: '⊙ Radial Base', icon: Moon },
];

// Função que gera o CSS do degradê baseado na direção
export function buildOverlayStyle(config: GradientOverlayConfig): React.CSSProperties {
  if (!config.enabled) return {};

  const { direction, color, opacity, heightPercent, startPosition } = config;
  const alpha = Math.round(opacity * 2.55); // 0-100 → 0-255
  const colorWithAlpha = `${color}${alpha.toString(16).padStart(2, '0')}`;

  let gradient = '';
  switch (direction) {
    case 'to-bottom':
      gradient = startPosition === 'top'
        ? `linear-gradient(to bottom, ${colorWithAlpha} 0%, transparent 100%)`
        : `linear-gradient(to bottom, transparent 0%, ${colorWithAlpha} 100%)`;
      break;
    case 'to-top':
      gradient = startPosition === 'top'
        ? `linear-gradient(to top, ${colorWithAlpha} 0%, transparent 100%)`
        : `linear-gradient(to top, transparent 0%, ${colorWithAlpha} 100%)`;
      break;
    case 'to-right':
      gradient = `linear-gradient(to right, ${colorWithAlpha} 0%, transparent 100%)`;
      break;
    case 'to-left':
      gradient = `linear-gradient(to left, ${colorWithAlpha} 0%, transparent 100%)`;
      break;
    case 'to-bottom-right':
      gradient = `linear-gradient(to bottom right, transparent 0%, ${colorWithAlpha} 100%)`;
      break;
    case 'to-bottom-left':
      gradient = `linear-gradient(to bottom left, transparent 0%, ${colorWithAlpha} 100%)`;
      break;
    case 'to-top-right':
      gradient = `linear-gradient(to top right, transparent 0%, ${colorWithAlpha} 100%)`;
      break;
    case 'to-top-left':
      gradient = `linear-gradient(to top left, transparent 0%, ${colorWithAlpha} 100%)`;
      break;
    case 'radial-center':
      gradient = `radial-gradient(circle at center, ${colorWithAlpha} 0%, transparent 80%)`;
      break;
    case 'radial-bottom':
      gradient = `radial-gradient(circle at bottom, ${colorWithAlpha} 0%, transparent 80%)`;
      break;
  }

  return {
    background: gradient,
    width: '100%',
    height: `${heightPercent}%`,
  };
}

interface TextGradientOverlayProps {
  config: GradientOverlayConfig;
  onChange: (config: GradientOverlayConfig) => void;
}

export const TextGradientOverlay: React.FC<TextGradientOverlayProps> = ({
  config,
  onChange,
}) => {
  const update = (patch: Partial<GradientOverlayConfig>) => {
    onChange({ ...config, ...patch });
  };

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="w-4 h-4 accent-brand-500"
        />
        <span className="text-xs font-bold text-white">Aplicar degradê de contraste</span>
      </label>

      {config.enabled && (
        <>
          {/* Cor + Opacidade */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Cor
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={config.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="flex-1 px-2 py-1 text-[10px] rounded bg-white/5 border border-white/10 text-white uppercase font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Opacidade
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={config.opacity}
                  onChange={(e) => update({ opacity: Number(e.target.value) })}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-[10px] font-mono w-8 text-right">{config.opacity}%</span>
              </div>
            </div>
          </div>

          {/* Direção */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Direção do Degradê
            </label>
            <div className="grid grid-cols-5 gap-1">
              {DIRECTIONS.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.value}
                    onClick={() => update({ direction: d.value })}
                    title={d.label}
                    className={`p-2 rounded-lg text-[10px] font-bold border transition-all flex flex-col items-center gap-0.5 ${
                      config.direction === d.value
                        ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-500 mt-1 text-center">
              {DIRECTIONS.find((d) => d.value === config.direction)?.label}
            </p>
          </div>

          {/* Altura */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-1">
              <span>Tamanho (% da altura do canvas)</span>
              <span>{config.heightPercent}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={config.heightPercent}
              onChange={(e) => update({ heightPercent: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Posição */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Onde o degradê é mais forte
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['top', 'center', 'bottom'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => update({ startPosition: p })}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border ${
                    config.startPosition === p
                      ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  {p === 'top' ? '↑ Topo' : p === 'center' ? '● Centro' : '↓ Base'}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-gray-500 leading-relaxed">
            💡 Use <strong className="text-emerald-300">preto 60-80%</strong> para dar contraste sobre fotos claras, ou <strong className="text-amber-300">branco 40-50%</strong> para fotos escuras.
          </p>
        </>
      )}
    </div>
  );
};
