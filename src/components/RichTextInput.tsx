import React, { useRef, useState } from 'react';
import { Bold, Italic } from 'lucide-react';

export interface RichTextFormatting {
  bold: string[];
  italic: string[];
}

export const EMPTY_RICH_TEXT: RichTextFormatting = { bold: [], italic: [] };

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  formatting: RichTextFormatting;
  onFormattingChange: (formatting: RichTextFormatting) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const RichTextInput: React.FC<RichTextInputProps> = ({
  value,
  onChange,
  formatting,
  onFormattingChange,
  placeholder,
  rows = 2,
  className = '',
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState('');

  const captureSelection = () => {
    const input = inputRef.current;
    if (!input) return;
    setSelection(value.slice(input.selectionStart, input.selectionEnd).trim());
  };

  const toggleFormat = (field: 'bold' | 'italic') => {
    if (!selection) return;
    const exists = formatting[field].includes(selection);
    onFormattingChange({
      ...formatting,
      [field]: exists
        ? formatting[field].filter((phrase) => phrase !== selection)
        : [...formatting[field], selection],
    });
  };

  return (
    <div className="space-y-1.5">
      <textarea
        ref={inputRef}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onSelect={captureSelection}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
        placeholder={placeholder}
        className={className}
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!selection}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => toggleFormat('bold')}
          className={`rounded-lg border p-1.5 transition-colors disabled:opacity-35 ${
            selection && formatting.bold.includes(selection)
              ? 'border-brand-500 bg-brand-500/20 text-brand-300'
              : 'border-white/10 bg-white/5 text-gray-300 hover:text-white'
          }`}
          title="Aplicar ou remover negrito no trecho selecionado"
        >
          <Bold size={13} />
        </button>
        <button
          type="button"
          disabled={!selection}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => toggleFormat('italic')}
          className={`rounded-lg border p-1.5 transition-colors disabled:opacity-35 ${
            selection && formatting.italic.includes(selection)
              ? 'border-brand-500 bg-brand-500/20 text-brand-300'
              : 'border-white/10 bg-white/5 text-gray-300 hover:text-white'
          }`}
          title="Aplicar ou remover itálico no trecho selecionado"
        >
          <Italic size={13} />
        </button>
        <span className="min-w-0 truncate text-[9px] text-gray-500">
          {selection ? `Selecionado: “${selection}”` : 'Selecione palavras no campo e aplique B ou I'}
        </span>
      </div>
    </div>
  );
};

export function renderRichText(text: string, formatting?: RichTextFormatting) {
  if (!text) return text;
  if (!formatting || (!formatting.bold.length && !formatting.italic.length)) return text;
  const chars = text.split('').map((character) => ({ character, bold: false, italic: false }));

  // IMPORTANTE: marca apenas a PRIMEIRA ocorrencia de cada frase para evitar
  // que a mesma palavra fique em bold em todas as posicoes do texto.
  const markFirstPhrase = (phrases: string[], field: 'bold' | 'italic') => {
    phrases.filter(Boolean).forEach((phrase) => {
      const start = text.indexOf(phrase);
      if (start < 0) return;
      for (let index = start; index < start + phrase.length && index < chars.length; index += 1) {
        chars[index][field] = true;
      }
    });
  };

  markFirstPhrase(formatting.bold, 'bold');
  markFirstPhrase(formatting.italic, 'italic');

  const runs: Array<{ text: string; bold: boolean; italic: boolean }> = [];
  chars.forEach((entry) => {
    const last = runs[runs.length - 1];
    if (last && last.bold === entry.bold && last.italic === entry.italic) {
      last.text += entry.character;
    } else {
      runs.push({ text: entry.character, bold: entry.bold, italic: entry.italic });
    }
  });

  return runs.map((run, index) => (
    <span
      key={`${index}-${run.text}`}
      style={{
        fontWeight: run.bold ? 900 : 'inherit',  // usa 900 (mais forte) para garantir visibilidade
        fontStyle: run.italic ? 'italic' : 'normal',
      }}
    >
      {run.text}
    </span>
  ));
}
