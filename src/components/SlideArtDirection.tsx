import React, { useMemo, useRef, useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  Wand2,
  Check,
  X,
  User,
  Upload,
} from 'lucide-react';
import {
  ART_DIRECTIONS,
  VISUAL_CATEGORIES,
  buildDirectedPrompt,
  ArtDirectionLevel,
} from '@/lib/creativeDirector';

interface SlideArtDirectionProps {
  direction: ArtDirectionLevel;
  visualCategory: string;
  briefing: string;
  style: string; // STYLE_MODIFIERS key
  brandColors?: { primaryColor: string; secondaryColor: string; backgroundColor: string };
  title: string; // usado como fallback do briefing
  personImage: string | null;
  onChangeDirection: (d: ArtDirectionLevel) => void;
  onChangeVisualCategory: (id: string) => void;
  onChangeBriefing: (b: string) => void;
  onApplyToPrompt: (composed: string) => void;
  onUploadPerson: (dataUrl: string | null) => void;
}

export const SlideArtDirection: React.FC<SlideArtDirectionProps> = ({
  direction,
  visualCategory,
  briefing,
  style,
  brandColors,
  title,
  personImage,
  onChangeDirection,
  onChangeVisualCategory,
  onChangeBriefing,
  onApplyToPrompt,
  onUploadPerson,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDirection = ART_DIRECTIONS.find((d) => d.id === direction);
  const selectedCategory = VISUAL_CATEGORIES.find((c) => c.id === visualCategory);

  // Foto de personagem só faz sentido em níveis Dramático ou Cinematográfico
  const supportsPerson = direction === 'dramatico' || direction === 'cinematografico';

  const composedPrompt = useMemo(
    () =>
      buildDirectedPrompt({
        briefing: briefing || title || 'Slide do carrossel',
        direction,
        visualCategory,
        style,
        brandColors: brandColors
          ? `${brandColors.primaryColor}, ${brandColors.secondaryColor}, ${brandColors.backgroundColor}`
          : undefined,
        personPhoto: supportsPerson && !!personImage,
      }),
    [briefing, direction, visualCategory, style, title, brandColors, personImage, supportsPerson]
  );

  const handleApplyCopy = (text: string) => {
    onApplyToPrompt(text);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUploadPerson(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent overflow-hidden">
      {/* HEADER */}
      <button
        onClick={() => setShowPreview((v) => !v)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={11} className="text-pink-400" />
          Direção Artística deste slide
        </span>
        <div className="flex items-center gap-1.5">
          {selectedDirection && (
            <span className="text-[9px] font-bold text-gray-400">
              {selectedDirection.emoji} {selectedDirection.shortLabel}
              {selectedCategory && ` · ${selectedCategory.emoji}`}
            </span>
          )}
          {showPreview ? (
            <ChevronUp size={11} className="text-gray-500" />
          ) : (
            <ChevronDown size={11} className="text-gray-500" />
          )}
        </div>
      </button>

      {showPreview && (
        <div className="px-3 pb-3 space-y-3 border-t border-purple-500/10">
          {/* Briefing */}
          <div className="pt-2">
            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              ✍️ Briefing deste slide
            </label>
            <input
              type="text"
              value={briefing}
              onChange={(e) => onChangeBriefing(e.target.value)}
              placeholder={title ? `Ex: Capa chamativa sobre "${title.slice(0, 40)}"` : 'Tema específico deste slide'}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-[10px] focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* 4 Níveis compactos */}
          <div>
            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              🎚️ Nível
            </label>
            <div className="grid grid-cols-4 gap-1">
              {ART_DIRECTIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onChangeDirection(d.id)}
                  title={d.description}
                  className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border transition-all ${
                    direction === d.id
                      ? 'bg-pink-500/25 border-pink-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <div className="text-base mb-0.5">{d.emoji}</div>
                  <div className="leading-none">{d.shortLabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Categoria Visual */}
          <div>
            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              🎨 Categoria
            </label>
            <div className="grid grid-cols-4 gap-1">
              {VISUAL_CATEGORIES.map((cat) => {
                const disabled = !cat.bestWithLevels.includes(direction);
                return (
                  <button
                    key={cat.id}
                    onClick={() => !disabled && onChangeVisualCategory(cat.id)}
                    disabled={disabled}
                    title={disabled ? 'Combinação fraca com este nível' : cat.description}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border transition-all ${
                      visualCategory === cat.id
                        ? 'bg-blue-500/25 border-blue-500 text-white'
                        : disabled
                        ? 'bg-white/[0.02] border-white/5 text-gray-600 cursor-not-allowed opacity-40'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <div className="text-base mb-0.5">{cat.emoji}</div>
                    <div className="leading-none truncate">{cat.label.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload de foto do personagem (apenas em níveis Dramático/Cinematográfico) */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <User size={10} /> Foto do Personagem
              </label>
              {!supportsPerson && (
                <span className="text-[8px] text-amber-400/80 italic">
                  Só injeta no prompt em níveis Dramático/Cinema
                </span>
              )}
            </div>
            {!personImage ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!supportsPerson}
                className={`w-full text-[10px] py-2 px-2 rounded-lg border border-dashed transition-all flex items-center justify-center gap-1.5 ${
                  supportsPerson
                    ? 'text-gray-300 hover:text-brand-400 border-white/10 hover:border-brand-500/50'
                    : 'text-gray-600 border-white/5 cursor-not-allowed'
                }`}
                title={supportsPerson ? 'Anexar foto recortada (PNG)' : 'Mude para Dramático ou Cinema para usar'}
              >
                <Upload size={11} />
                {supportsPerson ? '+ Anexar foto do personagem' : 'Indisponível neste nível'}
              </button>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-brand-500/30">
                <img
                  src={personImage}
                  alt="personagem"
                  className="w-full h-20 object-contain bg-black/40"
                />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-brand-500/80 text-white text-[8px] font-bold uppercase">
                  Foto ativa
                </div>
                <button
                  onClick={() => onUploadPerson(null)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                  title="Remover foto"
                >
                  <X size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Copy templates */}
          {selectedCategory && selectedCategory.copyTemplates.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                💡 Copy sugerido (clique p/ aplicar no prompt)
              </p>
              <div className="space-y-1">
                {selectedCategory.copyTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => handleApplyCopy(tpl)}
                    className="w-full text-left px-2 py-1 rounded-md bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/10 transition-colors"
                  >
                    <p className="text-[9px] font-semibold text-amber-100 italic">"{tpl}"</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview do prompt composto */}
          <div className="pt-2 border-t border-purple-500/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                <Eye size={10} /> Prompt composto
              </span>
              <span className="text-[8px] text-gray-500 font-mono">{composedPrompt.prompt.length} chars</span>
            </div>
            <pre className="text-[9px] text-gray-300 font-mono leading-relaxed bg-black/30 border border-white/5 rounded-lg p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
              {composedPrompt.prompt}
            </pre>
            <button
              onClick={() => onApplyToPrompt(composedPrompt.prompt)}
              className="w-full mt-1.5 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border border-purple-400 transition-all shadow-lg shadow-purple-500/20"
            >
              <Wand2 size={11} /> Aplicar este prompt composto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
