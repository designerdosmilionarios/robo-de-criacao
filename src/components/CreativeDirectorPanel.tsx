import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  CREATIVE_CATEGORIES,
  buildCreativePrompt,
  HEADLINE_PATTERNS,
  HOOK_FORMULAS,
  STYLE_MODIFIERS,
  PromptTemplate,
  CopySnippet,
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
}

export const CreativeDirectorPanel: React.FC<CreativeDirectorPanelProps> = ({
  onApplyPrompt,
  onApplyHeadline,
  onApplyHighlight,
  onApplySubline,
  onApplyCta,
  onApplyTag,
  brandColors,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ecommerce');
  const [selectedStyle, setSelectedStyle] = useState<string>('premium');
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>('prompts');
  const [expandedCopyType, setExpandedCopyType] = useState<string | null>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const category = CREATIVE_CATEGORIES.find((c) => c.id === selectedCategory);

  const handleUsePrompt = (prompt: PromptTemplate) => {
    const fullPrompt = buildCreativePrompt(selectedCategory, prompt.id, selectedStyle);
    onApplyPrompt(fullPrompt);
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
