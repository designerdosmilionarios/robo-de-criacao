import React from 'react';

interface TextPositionControlProps {
  label: string;
  color: string; // ex: 'amber', 'emerald', 'blue', 'cyan'
  pos: { x: number; y: number } | null;
  onChange: (pos: { x: number; y: number } | null) => void;
}

// Componente reutilizável para sliders X/Y de posição de texto
// Mostra grid 3x3 de atalhos + sliders finos para ajuste livre
export const TextPositionControl: React.FC<TextPositionControlProps> = ({
  label,
  color,
  pos,
  onChange,
}) => {
  const xVal = pos?.x ?? 50;
  const yVal = pos?.y ?? 50;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold text-${color}-300 uppercase tracking-wider`}>
          {label}
        </span>
        <button
          onClick={() => onChange(null)}
          className="text-[9px] text-gray-500 hover:text-white"
        >
          ↺ Resetar
        </button>
      </div>

      {/* Slider X */}
      <div>
        <div className="flex items-center justify-between text-[9px] text-gray-400 mb-0.5">
          <span>X (horizontal)</span>
          <span>{Math.round(xVal)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={xVal}
          onChange={(e) => onChange({ x: Number(e.target.value), y: yVal })}
          className={`w-full accent-${color}-500`}
        />
      </div>

      {/* Slider Y */}
      <div>
        <div className="flex items-center justify-between text-[9px] text-gray-400 mb-0.5">
          <span>Y (vertical)</span>
          <span>{Math.round(yVal)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={yVal}
          onChange={(e) => onChange({ x: xVal, y: Number(e.target.value) })}
          className={`w-full accent-${color}-500`}
        />
      </div>
    </div>
  );
};
