import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ToggleRowProps {
  label: string;
  active: boolean;
  onChange?: (active: boolean) => void;
  disabled?: boolean;
}

// Linha de toggle simples com label e switch
export const ToggleRow: React.FC<ToggleRowProps> = ({ label, active, onChange, disabled = false }) => {
  return (
    <label
      className={`flex items-center justify-between p-1.5 rounded-md transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-1.5">
        {active ? (
          <Eye size={11} className="text-emerald-400" />
        ) : (
          <EyeOff size={11} className="text-gray-500" />
        )}
        <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-gray-500'}`}>
          {label}
        </span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          if (disabled || !onChange) return;
          onChange(!active);
        }}
        className={`relative inline-flex w-8 h-4 rounded-full transition-colors ${
          active ? 'bg-emerald-500' : 'bg-white/10'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            active ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
};
