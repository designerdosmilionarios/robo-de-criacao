import React, { useState } from 'react';
import {
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  ChevronUp,
  Bold,
  Underline,
  Eye,
  EyeOff,
} from 'lucide-react';

// Configuração tipográfica completa por texto
export interface TypographyConfig {
  visible: boolean;
  fontFamily: string;
  fontSize: number; // em pixels (relativo ao canvas)
  fontWeight: '300' | '400' | '500' | '600' | '700' | '800' | '900';
  lineHeight: number; // multiplicador (1.0 = normal)
  letterSpacing: number; // em pixels (pode ser negativo)
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  color: string; // hex
  useUppercase: boolean;
  useUnderline: boolean;
  // Sombra do texto
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  // Caixa de destaque (highlight) atrás do texto
  highlightEnabled: boolean;
  highlightColor: string;
  highlightPaddingX: number;
  highlightPaddingY: number;
  highlightBorderRadius: number;
}

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  visible: true,
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: '700',
  lineHeight: 1.1,
  letterSpacing: -1,
  textAlign: 'left',
  verticalAlign: 'bottom',
  color: '#ffffff',
  useUppercase: false,
  useUnderline: false,
  shadowEnabled: false,
  shadowColor: '#000000',
  shadowBlur: 8,
  shadowOffsetX: 0,
  shadowOffsetY: 2,
  highlightEnabled: false,
  highlightColor: '#FFD700',
  highlightPaddingX: 12,
  highlightPaddingY: 4,
  highlightBorderRadius: 4,
};

const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extrabold' },
  { value: '900', label: 'Black' },
];

interface TypographyControlProps {
  label: string;
  config: TypographyConfig;
  onChange: (config: TypographyConfig) => void;
  defaultColor?: string;
  localFonts: { family: string }[];
  brandHeadlineFont?: string;
  brandBodyFont?: string;
  allowFontFamily?: boolean;
}

export const TypographyControl: React.FC<TypographyControlProps> = ({
  label,
  config,
  onChange,
  defaultColor = '#ffffff',
  localFonts,
  brandHeadlineFont,
  brandBodyFont,
  allowFontFamily = true,
}) => {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<TypographyConfig>) => {
    onChange({ ...config, ...patch });
  };

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      {/* HEADER DO CONTROLE */}
      <div className="flex items-center justify-between p-3 bg-white/[0.02]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => update({ visible: !config.visible })}
            className={`p-1 rounded ${config.visible ? 'text-emerald-400' : 'text-gray-500'}`}
            title={config.visible ? 'Ocultar' : 'Mostrar'}
          >
            {config.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <span className="text-[11px] font-bold text-white truncate">{label}</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white p-1"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* CONTEÚDO EXPANDIDO */}
      {expanded && (
        <div className="p-3 space-y-3 border-t border-white/10 bg-black/20">
          {/* FONTE */}
          {allowFontFamily && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Fonte da Família
              </label>
              <select
                value={config.fontFamily}
                onChange={(e) => update({ fontFamily: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] focus:border-brand-500 focus:outline-none"
              >
                {brandHeadlineFont && (
                  <option value={brandHeadlineFont} className="bg-[#11131a]">
                    {brandHeadlineFont} (Marca)
                  </option>
                )}
                {brandBodyFont && brandBodyFont !== brandHeadlineFont && (
                  <option value={brandBodyFont} className="bg-[#11131a]">
                    {brandBodyFont} (Marca Body)
                  </option>
                )}
                {localFonts.map((f) => (
                  <option key={f.family} value={f.family} className="bg-[#11131a]">
                    {f.family}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TAMANHO + PESO */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Tamanho (px)
              </label>
              <input
                type="number"
                value={config.fontSize}
                min={8}
                max={200}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] focus:border-brand-500 focus:outline-none"
              />
              <input
                type="range"
                min="12"
                max="120"
                value={config.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="w-full mt-1 accent-brand-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Peso
              </label>
              <select
                value={config.fontWeight}
                onChange={(e) => update({ fontWeight: e.target.value as any })}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] focus:border-brand-500 focus:outline-none"
              >
                {FONT_WEIGHTS.map((w) => (
                  <option key={w.value} value={w.value} className="bg-[#11131a]">
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ALINHAMENTO */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Alinhamento
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => update({ textAlign: align })}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    config.textAlign === align
                      ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {align === 'left' && <AlignLeft size={11} className="mx-auto" />}
                  {align === 'center' && <AlignCenter size={11} className="mx-auto" />}
                  {align === 'right' && <AlignRight size={11} className="mx-auto" />}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(['top', 'middle', 'bottom'] as const).map((va) => (
                <button
                  key={va}
                  onClick={() => update({ verticalAlign: va })}
                  className={`py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    config.verticalAlign === va
                      ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {va === 'top' ? 'Topo' : va === 'middle' ? 'Centro' : 'Base'}
                </button>
              ))}
            </div>
          </div>

          {/* ESPAÇAMENTO */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Entre Linhas ({config.lineHeight.toFixed(2)})
              </label>
              <input
                type="range"
                min="0.8"
                max="2"
                step="0.05"
                value={config.lineHeight}
                onChange={(e) => update({ lineHeight: Number(e.target.value) })}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Entre Letras ({config.letterSpacing}px)
              </label>
              <input
                type="range"
                min="-5"
                max="20"
                value={config.letterSpacing}
                onChange={(e) => update({ letterSpacing: Number(e.target.value) })}
                className="w-full accent-brand-500"
              />
            </div>
          </div>

          {/* COR + ESTILO */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Cor do Texto
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.color}
                onChange={(e) => update({ color: e.target.value })}
                className="w-10 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={config.color}
                onChange={(e) => update({ color: e.target.value })}
                className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => update({ color: defaultColor })}
              className="mt-1 text-[10px] text-gray-400 hover:text-white"
            >
              ↺ Resetar para cor padrão
            </button>
          </div>

          {/* TRANSFORMAÇÕES */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.useUppercase}
                onChange={(e) => update({ useUppercase: e.target.checked })}
                className="accent-brand-500"
              />
              <span className="text-[10px] font-bold uppercase tracking-wider">Caixa Alta</span>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.useUnderline}
                onChange={(e) => update({ useUnderline: e.target.checked })}
                className="accent-brand-500"
              />
              <Underline size={11} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sublinhado</span>
            </label>
          </div>

          {/* SOMBRA */}
          <div className="pt-2 border-t border-white/5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              <input
                type="checkbox"
                checked={config.shadowEnabled}
                onChange={(e) => update({ shadowEnabled: e.target.checked })}
                className="accent-brand-500"
              />
              Sombra do Texto
            </label>
            {config.shadowEnabled && (
              <div className="space-y-2 pl-5">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.shadowColor}
                    onChange={(e) => update({ shadowColor: e.target.value })}
                    className="w-8 h-6 rounded border border-white/10 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] text-gray-400">Cor da sombra</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Blur</span>
                    <span>{config.shadowBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={config.shadowBlur}
                    onChange={(e) => update({ shadowBlur: Number(e.target.value) })}
                    className="w-full accent-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-gray-400 mb-0.5">X offset {config.shadowOffsetX}</div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={config.shadowOffsetX}
                      onChange={(e) => update({ shadowOffsetX: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 mb-0.5">Y offset {config.shadowOffsetY}</div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={config.shadowOffsetY}
                      onChange={(e) => update({ shadowOffsetY: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CAIXA DE DESTAQUE */}
          <div className="pt-2 border-t border-white/5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              <input
                type="checkbox"
                checked={config.highlightEnabled}
                onChange={(e) => update({ highlightEnabled: e.target.checked })}
                className="accent-brand-500"
              />
              Caixa de Destaque (Highlight)
            </label>
            {config.highlightEnabled && (
              <div className="space-y-2 pl-5">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.highlightColor}
                    onChange={(e) => update({ highlightColor: e.target.value })}
                    className="w-8 h-6 rounded border border-white/10 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] text-gray-400">Cor do fundo</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] text-gray-400 mb-0.5">Padd X</div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={config.highlightPaddingX}
                      onChange={(e) => update({ highlightPaddingX: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 mb-0.5">Padd Y</div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={config.highlightPaddingY}
                      onChange={(e) => update({ highlightPaddingY: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 mb-0.5">Raio</div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={config.highlightBorderRadius}
                      onChange={(e) => update({ highlightBorderRadius: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Função helper para gerar o style CSS baseado na config
export function buildTextStyle(config: TypographyConfig): React.CSSProperties {
  const styles: React.CSSProperties = {
    fontFamily: config.fontFamily,
    fontSize: `${config.fontSize}px`,
    fontWeight: config.fontWeight,
    lineHeight: config.lineHeight,
    letterSpacing: `${config.letterSpacing}px`,
    textAlign: config.textAlign,
    color: config.color,
    textTransform: config.useUppercase ? 'uppercase' : 'none',
    textDecoration: config.useUnderline ? 'underline' : 'none',
  };
  if (config.shadowEnabled) {
    styles.textShadow = `${config.shadowOffsetX}px ${config.shadowOffsetY}px ${config.shadowBlur}px ${config.shadowColor}`;
  }
  return styles;
}

// Função helper para gerar o style do container (com destaque se ativado)
export function buildContainerStyle(
  config: TypographyConfig,
  justifyVertical: 'top' | 'middle' | 'bottom'
): React.CSSProperties {
  const justifyMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
  const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
  return {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: justifyMap[config.verticalAlign] || 'flex-end',
    alignItems: alignMap[config.textAlign] || 'flex-start',
  };
}
