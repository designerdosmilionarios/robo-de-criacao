import React, { useState, useMemo, useEffect } from 'react';
import {
  Wand2,
  Sparkles,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  BookOpen,
  Target,
  Palette,
  Layers,
  Eye,
} from 'lucide-react';
import {
  CREATIVE_CATEGORIES,
  buildCreativePrompt,
  HEADLINE_PATTERNS,
  HOOK_FORMULAS,
  STYLE_MODIFIERS,
  PromptTemplate,
  CopySnippet,
  ART_DIRECTIONS,
  VISUAL_CATEGORIES,
  buildDirectedPrompt,
  ArtDirectionLevel,
} from '@/lib/creativeDirector';

interface CreativeDirectorPanelProps {
  onApplyPrompt: (prompt: string) => void;
  onApplyHeadline: (headline: string) => void;
  onApplyHighlight: (text: string) => void;
  onApplySubline: (text: string) => void;
  onApplyCta: (text: string) => void;
  onApplyTag: (text: string) => void;
  brandColors?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
  };
  // Valores iniciais da direção artística (carregados do projeto salvo)
  initialArtDirection?: 'minimalista' | 'editorial' | 'dramatico' | 'cinematografico';
  initialVisualCategory?: string;
  initialArtBriefing?: string;
  // Foto do personagem (pai passa para injetar no prompt composto)
  personImage?: string | null;
  // Callbacks para persistir mudanças da direção artística (paridade com SlideEditor)
  onChangeArtDirection?: (d: 'minimalista' | 'editorial' | 'dramatico' | 'cinematografico') => void;
  onChangeVisualCategory?: (id: string) => void;
  onChangeArtBriefing?: (b: string) => void;
}

export const CreativeDirectorPanel: React.FC<CreativeDirectorPanelProps> = ({
  onApplyPrompt,
  onApplyHeadline,
  onApplyHighlight,
  onApplySubline,
  onApplyCta,
  onApplyTag,
  brandColors,
  initialArtDirection = 'editorial',
  initialVisualCategory = 'citacao',
  initialArtBriefing = '',
  personImage,
  onChangeArtDirection,
  onChangeVisualCategory,
  onChangeArtBriefing,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ecommerce');
  const [selectedStyle, setSelectedStyle] = useState<string>('premium');
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>('prompts');
  const [expandedCopyType, setExpandedCopyType] = useState<string | null>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // === NOVO: Direção Artística ===
  const [artDirection, setArtDirection] = useState<ArtDirectionLevel>(initialArtDirection);
  const [visualCategoryId, setVisualCategoryId] = useState<string>(initialVisualCategory);
  const [briefing, setBriefing] = useState<string>(initialArtBriefing);

  // Sincroniza com props externas quando mudam (carregamento de projeto salvo)
  useEffect(() => {
    setArtDirection(initialArtDirection);
  }, [initialArtDirection]);
  useEffect(() => {
    setVisualCategoryId(initialVisualCategory);
  }, [initialVisualCategory]);
  useEffect(() => {
    setBriefing(initialArtBriefing);
  }, [initialArtBriefing]);
  const [showPromptPreview, setShowPromptPreview] = useState<boolean>(false);
  const [editedPrompt, setEditedPrompt] = useState<string>('');

  const supportsPerson = artDirection === 'dramatico' || artDirection === 'cinematografico';

  const directedPrompt = useMemo(
    () =>
      buildDirectedPrompt({
        briefing: briefing || 'Carrossel para mentoria de alta performance',
        direction: artDirection,
        visualCategory: visualCategoryId,
        style: selectedStyle,
        brandColors: brandColors
          ? `${brandColors.primaryColor}, ${brandColors.secondaryColor}, ${brandColors.backgroundColor}`
          : undefined,
        personPhoto: supportsPerson && !!personImage,
      }),
    [briefing, artDirection, visualCategoryId, selectedStyle, brandColors, personImage, supportsPerson]
  );

  // Sincroniza o prompt editável quando o prompt dirigido muda (e o modal não está aberto editando)
  useEffect(() => {
    if (!showPromptPreview) {
      setEditedPrompt(directedPrompt.prompt);
    }
  }, [directedPrompt.prompt, showPromptPreview]);

  const category = CREATIVE_CATEGORIES.find((c) => c.id === selectedCategory);
  const selectedArtDirection = ART_DIRECTIONS.find((d) => d.id === artDirection);
  const selectedVisualCategory = VISUAL_CATEGORIES.find((c) => c.id === visualCategoryId);

  const handleUsePrompt = (prompt: PromptTemplate) => {
    const fullPrompt = buildCreativePrompt(selectedCategory, prompt.id, selectedStyle);
    onApplyPrompt(fullPrompt);
  };

  const handleApplyDirectedPrompt = () => {
    onApplyPrompt(editedPrompt);
    setShowPromptPreview(false);
  };

  const handleUseCopy = (snippet: CopySnippet) => {
    const fullText = `${snippet.text}`;
    if (snippet.type === 'hook') {
      // Hook pode virar o destaque (highlight) já que normalmente fica grande
      onApplyHighlight(fullText);
    } else if (snippet.type === 'headline') {
      onApplyHeadline(fullText);
    } else if (snippet.type === 'cta') {
      onApplyCta(fullText);
    } else if (snippet.type === 'subline') {
      onApplySubline(fullText);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 via-brand-500/5 to-transparent border border-purple-500/30 shadow-xl space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Wand2 size={16} className="text-purple-400" />
          Diretor Criativo IA
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            BETA
          </span>
        </h3>
      </div>

      {/* ============================================ */}
      {/* DIREÇÃO ARTÍSTICA — NOVO SISTEMA 4 NÍVEIS */}
      {/* ============================================ */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-purple-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={12} className="text-pink-400" /> Direção Artística
          </h4>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
            NOVO
          </span>
        </div>

        {/* Briefing (entrada do usuário) */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            ✍️ Briefing / Tema
          </label>
          <textarea
            value={briefing}
            onChange={(e) => {
              setBriefing(e.target.value);
              onChangeArtBriefing?.(e.target.value);
            }}
            placeholder="Ex: Carrossel sobre vencer a crise com propósito, público 30-45 anos, tom motivacional"
            rows={2}
            className="w-full px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/10 text-white text-[11px] focus:border-purple-500 focus:outline-none resize-none"
          />
        </div>

        {/* 4 Níveis de Direção */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            🎚️ Nível de Direção ({ART_DIRECTIONS.length})
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {ART_DIRECTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                setArtDirection(d.id);
                onChangeArtDirection?.(d.id);
              }}
                className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all text-left ${
                  artDirection === d.id
                    ? 'bg-pink-500/25 border-pink-500 text-white shadow-lg shadow-pink-500/10'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{d.emoji}</span>
                  <span className="font-bold">{d.shortLabel}</span>
                </div>
                <p className="text-[9px] text-gray-400 leading-tight line-clamp-2 font-normal">
                  {d.description}
                </p>
              </button>
            ))}
          </div>
          {selectedArtDirection && (
            <div className="mt-2 p-2 rounded-lg bg-black/30 border border-white/5">
              <div className="flex items-center gap-1.5 text-[9px] text-pink-300 font-bold uppercase mb-1">
                <Palette size={9} /> Paleta base
              </div>
              <code className="text-[10px] text-gray-300 font-mono">{selectedArtDirection.basePalette}</code>
            </div>
          )}
        </div>

        {/* Categoria Visual */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            🎨 Categoria Visual ({VISUAL_CATEGORIES.length})
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {VISUAL_CATEGORIES.map((cat) => {
              const disabled = !cat.bestWithLevels.includes(artDirection);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                  if (disabled) return;
                  setVisualCategoryId(cat.id);
                  onChangeVisualCategory?.(cat.id);
                }}
                  disabled={disabled}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all text-left flex items-center gap-1.5 ${
                    visualCategoryId === cat.id
                      ? 'bg-blue-500/25 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                      : disabled
                      ? 'bg-white/[0.02] border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                  title={disabled ? `Recomendado para outros níveis` : cat.description}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
          {selectedVisualCategory && (
            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
              {selectedVisualCategory.description}
            </p>
          )}
        </div>

        {/* Templates de Copy da Categoria Visual */}
        {selectedVisualCategory && selectedVisualCategory.copyTemplates.length > 0 && (
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              💡 Copy sugerido (clique p/ aplicar)
            </p>
            <div className="space-y-1">
              {selectedVisualCategory.copyTemplates.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => onApplyHighlight(tpl)}
                  className="w-full text-left p-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/10 transition-colors"
                  title="Aplicar como destaque"
                >
                  <p className="text-[10px] font-semibold text-amber-100 italic">"{tpl}"</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview e Ação do Prompt Composto */}
        <div className="pt-2 border-t border-purple-500/20 space-y-2">
          <button
            onClick={() => setShowPromptPreview((v) => !v)}
            className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg bg-black/30 hover:bg-black/50 border border-white/5 transition-colors"
          >
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={11} /> {showPromptPreview ? 'Ocultar' : 'Ver'} Prompt Composto
            </span>
            {showPromptPreview ? <ChevronUp size={11} className="text-gray-500" /> : <ChevronDown size={11} className="text-gray-500" />}
          </button>

          {showPromptPreview && (
            <div className="space-y-2">
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={6}
                className="w-full px-2.5 py-2 rounded-xl bg-black/40 border border-purple-500/30 text-white text-[10px] font-mono focus:border-purple-500 focus:outline-none resize-y leading-relaxed"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleApplyDirectedPrompt}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border border-purple-400 transition-all shadow-lg shadow-purple-500/20"
                >
                  ✨ Aplicar este Prompt
                </button>
                <button
                  onClick={() => handleCopy(editedPrompt, 'directed-prompt')}
                  className="py-1.5 px-2 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                  title="Copiar prompt"
                >
                  {copiedId === 'directed-prompt' ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>

              {/* Decomposição do prompt (transparência) */}
              <details className="text-[10px]">
                <summary className="text-[9px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300">
                  Ver blocos decompostos
                </summary>
                <div className="mt-2 space-y-1 p-2 rounded-lg bg-black/20 border border-white/5">
                  {Object.entries(directedPrompt.blocks).map(([key, value]) =>
                    value ? (
                      <div key={key}>
                        <span className="text-purple-300 font-bold">{key}:</span>{' '}
                        <span className="text-gray-300">{value}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* CATEGORIAS */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
          🎯 Nicho do Criativo
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {CREATIVE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-purple-500/30 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
              }`}
            >
              <span className="text-base">{cat.emoji}</span>
              <span className="truncate text-[11px]">{cat.label}</span>
            </button>
          ))}
        </div>
        {category && (
          <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">{category.description}</p>
        )}
      </div>

      {/* ESTILO */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
          🎨 Estilo Visual
        </label>
        <select
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
          className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:border-purple-500 focus:outline-none"
        >
          {Object.entries(STYLE_MODIFIERS).map(([k, v]) => (
            <option key={k} value={k} className="bg-[#11131a]">
              {k.charAt(0).toUpperCase() + k.slice(1)} - {v.split(',')[0]}
            </option>
          ))}
        </select>
      </div>

      {/* PROMPTS ESPECIALIZADOS */}
      <div>
        <button
          onClick={() => setExpandedPrompt(expandedPrompt === 'prompts' ? null : 'prompts')}
          className="w-full flex items-center justify-between py-1.5"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={11} className="text-purple-400" /> Prompts Profissionais ({category?.prompts.length || 0})
          </span>
          {expandedPrompt === 'prompts' ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
        </button>
        {expandedPrompt === 'prompts' && category && (
          <div className="space-y-2 mt-2">
            {category.prompts.map((prompt) => (
              <div key={prompt.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-bold text-white leading-tight">{prompt.title}</h4>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    prompt.quality === 'premium' ? 'bg-amber-500/20 text-amber-300' :
                    prompt.quality === 'rapido' ? 'bg-emerald-500/20 text-emerald-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {prompt.quality}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed mb-2 line-clamp-3">
                  {prompt.prompt}
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleUsePrompt(prompt)}
                    className="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all"
                  >
                    ✨ Usar este Prompt
                  </button>
                  <button
                    onClick={() => handleCopy(prompt.prompt, prompt.id)}
                    className="py-1 px-2 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                    title="Copiar prompt"
                  >
                    {copiedId === prompt.id ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COPY: HOOKS / HEADLINES / CTAs */}
      <div>
        <button
          onClick={() => setExpandedCopyType(expandedCopyType === 'all' ? null : 'all')}
          className="w-full flex items-center justify-between py-1.5"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb size={11} className="text-amber-400" /> Copy / Gatilhos
          </span>
          {expandedCopyType === 'all' ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
        </button>
        {expandedCopyType === 'all' && category && (
          <div className="space-y-3 mt-2">
            {/* Hooks */}
            {category.copySnippets.filter(s => s.type === 'hook').length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-amber-300 font-bold uppercase">🔥 Hooks (chamada de atencao)</p>
                {category.copySnippets.filter(s => s.type === 'hook').map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleUseCopy(s)}
                    className="w-full text-left p-2 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 transition-colors group"
                  >
                    <p className="text-[11px] font-bold text-amber-100">"{s.text}"</p>
                  </button>
                ))}
              </div>
            )}

            {/* Headlines */}
            {category.copySnippets.filter(s => s.type === 'headline').length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-white font-bold uppercase">📰 Headlines</p>
                {category.copySnippets.filter(s => s.type === 'headline').map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleUseCopy(s)}
                    className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <p className="text-[11px] font-semibold text-white">{s.text}</p>
                  </button>
                ))}
              </div>
            )}

            {/* CTAs */}
            {category.copySnippets.filter(s => s.type === 'cta').length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-emerald-300 font-bold uppercase">🎯 CTAs (botoes)</p>
                {category.copySnippets.filter(s => s.type === 'cta').map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleUseCopy(s)}
                    className="w-full text-left p-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 transition-colors"
                  >
                    <p className="text-[11px] font-bold text-emerald-100">{s.text}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FORMULAS DE COPY (always visible, compact) */}
      <div>
        <details className="text-[11px]">
          <summary className="text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer flex items-center gap-1.5 mb-1">
            <BookOpen size={11} /> Formulas de Copywriting
          </summary>
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-[10px] text-purple-300 font-bold mb-1">💬 Hooks Infalíveis</p>
              <div className="space-y-1">
                {HOOK_FORMULAS.slice(0, 4).map((h, i) => (
                  <p key={i} className="text-[10px] text-gray-400 italic">"{h}"</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-purple-300 font-bold mb-1">📐 Padrões de Headline</p>
              <div className="space-y-1">
                {HEADLINE_PATTERNS.slice(0, 4).map((h, i) => (
                  <p key={i} className="text-[10px] text-gray-400">{h}</p>
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* PALETAS SUGERIDAS */}
      {category && (
        <div className="pt-3 border-t border-purple-500/10">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Palette size={11} className="text-pink-400" /> Paletas Sugeridas (clique p/ copiar)
          </p>
          <div className="space-y-1.5">
            {category.palettes.map((palette, i) => {
              const [c1, c2] = palette.split(' / ');
              return (
                <button
                  key={i}
                  onClick={() => handleCopy(palette, `palette-${i}`)}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors"
                >
                  <div className="w-6 h-6 rounded" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
                  <code className="text-[10px] text-gray-300 font-mono">{palette}</code>
                  {copiedId === `palette-${i}` && <Check size={10} className="text-emerald-400 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
