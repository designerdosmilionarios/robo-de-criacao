import React, { useState } from 'react';
import {
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Image as ImageIcon,
} from 'lucide-react';

interface BackgroundImageControlProps {
  scale: number; // 100 = 100% (default)
  offsetX: number; // -100 a 100 (%)
  offsetY: number; // -100 a 100 (%)
  onChange: (config: { scale: number; offsetX: number; offsetY: number }) => void;
  disabled?: boolean;
}

// Componente para controlar zoom e posicao da imagem de background
// Funciona como no Canva/Photoshop - arrastar para reposicionar + zoom in/out
export const BackgroundImageControl: React.FC<BackgroundImageControlProps> = ({
  scale,
  offsetX,
  offsetY,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
          <Move size={11} /> Imagem de Fundo
        </span>
        <button
          onClick={() => onChange({ scale: 100, offsetX: 0, offsetY: 0 })}
          disabled={disabled}
          className="text-[9px] text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-30"
        >
          <RotateCcw size={10} /> Reset
        </button>
      </div>

      {/* Zoom */}
      <div>
        <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 mb-1">
          <span className="flex items-center gap-1"><ZoomOut size={10} /> Zoom</span>
          <span>{scale}%</span>
          <ZoomIn size={10} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ scale: Math.max(50, scale - 10), offsetX, offsetY })}
            disabled={disabled || scale <= 50}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white text-xs disabled:opacity-30"
          >
            −
          </button>
          <input
            type="range"
            min="50"
            max="200"
            step="5"
            value={scale}
            disabled={disabled}
            onChange={(e) => onChange({ scale: Number(e.target.value), offsetX, offsetY })}
            className="flex-1 accent-purple-500 disabled:opacity-30"
          />
          <button
            onClick={() => onChange({ scale: Math.min(200, scale + 10), offsetX, offsetY })}
            disabled={disabled || scale >= 200}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white text-xs disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      {/* Posição X */}
      <div>
        <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 mb-1">
          <span>Horizontal (X)</span>
          <span>{Math.round(offsetX)}%</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          step="1"
          value={offsetX}
          disabled={disabled}
          onChange={(e) => onChange({ scale, offsetX: Number(e.target.value), offsetY })}
          className="w-full accent-purple-500 disabled:opacity-30"
        />
      </div>

      {/* Posição Y */}
      <div>
        <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 mb-1">
          <span>Vertical (Y)</span>
          <span>{Math.round(offsetY)}%</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          step="1"
          value={offsetY}
          disabled={disabled}
          onChange={(e) => onChange({ scale, offsetX, offsetY: Number(e.target.value) })}
          className="w-full accent-purple-500 disabled:opacity-30"
        />
      </div>

      {/* Atalhos de zoom */}
      <div className="grid grid-cols-4 gap-1">
        {[50, 75, 100, 150].map((p) => (
          <button
            key={p}
            onClick={() => onChange({ scale: p, offsetX, offsetY })}
            disabled={disabled}
            className={`py-0.5 rounded text-[10px] font-bold transition-all ${
              scale === p
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white disabled:opacity-30'
            }`}
          >
            {p}%
          </button>
        ))}
      </div>

      <p className="text-[9px] text-gray-500 leading-tight">
        💡 Ajuste o zoom e arraste os sliders para enquadrar a imagem no formato escolhido.
      </p>
    </div>
  );
};

// Aplica os parametros de transformacao na imagem de background
export function buildBackgroundImageStyle(config: { scale: number; offsetX: number; offsetY: number }): React.CSSProperties {
  const { scale, offsetX, offsetY } = config;
  return {
    transform: `scale(${scale / 100}) translate(${offsetX / scale * 100}%, ${offsetY / scale * 100}%)`,
    transformOrigin: 'center center',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };
}
