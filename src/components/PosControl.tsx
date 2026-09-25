import React from 'react';
import { X } from 'lucide-react';

interface PosControlProps {
  label: string;
  pos?: { x: number; y: number };
  onChange: (pos: { x: number; y: number } | null) => void;
}

// Slider X/Y compacto para reposicionar elementos do canvas
export const PosControl: React.FC<PosControlProps> = ({ label, pos, onChange }) => {
  const xVal = pos?.x ?? 50;
  const yVal = pos?.y ?? 50;
  const isCustom = pos !== undefined && pos !== null;

  return (
    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-cyan-300 uppercase">{label}</span>
        {isCustom && (
          <button
            onClick={() => onChange(null)}
            className="text-[9px] text-gray-400 hover:text-white flex items-center gap-0.5"
            title="Resetar posição automática"
          >
            <X size={9} /> Resetar
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[9px] text-gray-500 w-2">X</span>
        <input
          type="range"
          min="0"
          max="100"
          value={xVal}
          onChange={(e) => onChange({ x: Number(e.target.value), y: yVal })}
          className="flex-1 accent-cyan-500"
        />
        <span className="text-[9px] text-gray-400 w-6 text-right font-mono">{Math.round(xVal)}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-gray-500 w-2">Y</span>
        <input
          type="range"
          min="0"
          max="100"
          value={yVal}
          onChange={(e) => onChange({ x: xVal, y: Number(e.target.value) })}
          className="flex-1 accent-cyan-500"
        />
        <span className="text-[9px] text-gray-400 w-6 text-right font-mono">{Math.round(yVal)}%</span>
      </div>
    </div>
  );
};
