import React, { useState, useEffect, useRef } from 'react';
import { CarouselSlide, TemplateStyle } from '@/types';
import {
  Type,
  Sparkles,
  Plus,
  Trash2,
  Layout,
  Image as ImageIcon,
  Loader2,
  Wand2,
  Check,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  Layers,
} from 'lucide-react';
import { usePersistedState } from '@/lib/usePersistedState';
import { PosControl } from '@/components/PosControl';
import { ToggleRow } from '@/components/ToggleRow';

interface SlideEditorProps {
  slide: CarouselSlide;
  index: number;
  totalSlides: number;
  onUpdateSlide: (updated: CarouselSlide) => void;
  onAddSlide: () => void;
  onDeleteSlide: (id: string) => void;
  templateStyle: TemplateStyle;
  onChangeTemplateStyle: (style: TemplateStyle) => void;
  aspectRatio: '4:5' | '1:1' | '9:16';
  onChangeAspectRatio: (ratio: '4:5' | '1:1' | '9:16') => void;
  apiKey?: string;
  onOpenSettings: () => void;
  provider?: 'openai';
}

const TEMPLATE_OPTIONS: { value: TemplateStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'tech-modern', label: 'Tech Modern', emoji: '🚀', desc: 'Glows e grid futurista' },
  { value: 'glassmorphism', label: 'Glassmorphism', emoji: '💎', desc: 'Vidro fosco e profundidade' },
  { value: 'neo-brutalist', label: 'Neo Brutalist', emoji: '🟧', desc: 'Bordas fortes, alto contraste' },
  { value: 'minimalist-dark', label: 'Minimalist Dark', emoji: '⚫', desc: 'Tipografia limpa, foco no texto' },
];

const AI_MODELS = [
  { value: 'auto', label: '⭐ Auto (melhor → mais barato)' },
  { value: 'gpt-image-2.5-sunburst', label: '💎 2.5 Sunburst (Premium, $0.20)' },
  { value: 'gpt-image-2.5-flare', label: '⚡ 2.5 Flare (Rápido, $0.10)' },
  { value: 'gpt-image-2.5', label: '🔷 2.5 (Top, $0.15)' },
  { value: 'gpt-image-2', label: '🆕 2 (Novo, $0.05)' },
  { value: 'gpt-image-1.5', label: '🌟 1.5 (Excelente)' },
  { value: 'gpt-image-1', label: '✨ 1 (Recomendado, $0.02)' },
  { value: 'gpt-image-1-mini', label: '💰 1 Mini (Econômico)' },
  { value: 'dall-e-3', label: '🎨 DALL-E 3 (Clássico)' },
  { value: 'dall-e-2', label: '🏷️ DALL-E 2 (Básico)' },
];

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slide,
  index,
  totalSlides,
  onUpdateSlide,
  onAddSlide,
  onDeleteSlide,
  templateStyle,
  onChangeTemplateStyle,
  aspectRatio,
  onChangeAspectRatio,
  apiKey,
  onOpenSettings,
  provider,
}) => {
  // Estados persistidos
  const [imagePrompt, setImagePrompt] = usePersistedState<string>('slide_image_prompt', '');
  const [referenceImage, setReferenceImage] = usePersistedState<string | null>('slide_ref_image', null);
  const [selectedModel, setSelectedModel] = usePersistedState<string>('slide_model', 'auto');
  const [refineInstruction, setRefineInstruction] = usePersistedState<string>('slide_refine_instruction', '');
  const [variationsCount, setVariationsCount] = usePersistedState<number>('slide_variations_count', 4);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkVariations, setBulkVariations] = useState<string[]>([]);
  const [refinementHistory, setRefinementHistory] = useState<
    { instruction: string; result: string }[]
  >([]);
  const [imgError, setImgError] = useState<string | null>(null);
  const [generatedGallery, setGeneratedGallery] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);

  const refInputRef = useRef<HTMLInputElement>(null);

  // Resetar histórico quando o slide muda
  useEffect(() => {
    setRefinementHistory([]);
  }, [slide.id]);

  const handleChange = (field: keyof CarouselSlide, val: any) => {
    onUpdateSlide({ ...slide, [field]: val });
  };

  const handleBodyListChange = (itemIndex: number, text: string) => {
    const list = [...(slide.bodyList || [])];
    list[itemIndex] = text;
    handleChange('bodyList', list);
  };

  const handleAddBullet = () => {
    const list = [...(slide.bodyList || []), 'Novo ponto de destaque...'];
    handleChange('bodyList', list);
  };

  const handleRemoveBullet = (itemIndex: number) => {
    const list = (slide.bodyList || []).filter((_, i) => i !== itemIndex);
    handleChange('bodyList', list);
  };

  // === Geração de imagem ===
  const handleGenerateAiImage = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }
    const promptToUse =
      imagePrompt ||
      `Professional ${templateStyle} background illustration, dark aesthetic, theme: ${slide.title}`;

    setIsGeneratingImg(true);
    setImgError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          apiKey,
          size: '1024x1024',
          aspectRatio: aspectRatio === '4:5' ? '4:5' : aspectRatio === '9:16' ? '9:16' : '1:1',
          provider: 'openai',
          preferredModel: selectedModel !== 'auto' ? selectedModel : undefined,
          ...(referenceImage ? { imageBase64: referenceImage.replace(/^data:image\/\w+;base64,/, '') } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar imagem.');
      }
      handleChange('imageUrl', data.imageUrl);
      setGeneratedGallery((prev) => [data.imageUrl, ...prev].slice(0, 12));
    } catch (err: any) {
      setImgError(err.message || `Erro ao conectar à OpenAI.`);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // === Refinamento iterativo ===
  const handleRefine = async () => {
    if (!apiKey || !slide.imageUrl) {
      if (!apiKey) onOpenSettings();
      return;
    }
    if (!refineInstruction.trim()) return;

    setIsRefining(true);
    setImgError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${refineInstruction}. Maintain the composition and style of the reference image but apply this change.`,
          apiKey,
          size: '1024x1024',
          aspectRatio: aspectRatio === '4:5' ? '4:5' : aspectRatio === '9:16' ? '9:16' : '1:1',
          provider: 'openai',
          preferredModel: selectedModel !== 'auto' ? selectedModel : undefined,
          imageBase64: slide.imageUrl.replace(/^data:image\/\w+;base64,/, ''),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao refinar.');

      setRefinementHistory((prev) => [
        { instruction: refineInstruction, result: data.imageUrl },
        ...prev,
      ].slice(0, 5));
      handleChange('imageUrl', data.imageUrl);
      setGeneratedGallery((prev) => [data.imageUrl, ...prev].slice(0, 12));
      setRefineInstruction('');
    } catch (err: any) {
      setImgError(err.message || 'Erro ao refinar.');
    } finally {
      setIsRefining(false);
    }
  };

  // === Variações em massa ===
  const handleBulkGenerate = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }
    const promptToUse =
      imagePrompt ||
      `Professional ${templateStyle} background illustration, dark aesthetic, theme: ${slide.title}`;

    setIsBulkGenerating(true);
    setBulkVariations([]);
    setBulkProgress({ current: 0, total: variationsCount });

    const sizeMap: any = {
      '4:5': '1024x1280',
      '1:1': '1024x1024',
      '9:16': '1024x1792',
    };

    const newVariations: string[] = [];
    for (let i = 0; i < variationsCount; i++) {
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptToUse,
            apiKey,
            size: sizeMap[aspectRatio] || '1024x1024',
            aspectRatio,
            provider: 'openai',
            preferredModel: selectedModel !== 'auto' ? selectedModel : undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && data.imageUrl) {
          newVariations.push(data.imageUrl);
          setBulkVariations([...newVariations]);
          setGeneratedGallery((prev) => [data.imageUrl, ...prev].slice(0, 12));
        }
      } catch (err) {
        console.error('Erro na variação', i, err);
      }
      setBulkProgress({ current: i + 1, total: variationsCount });
    }

    if (newVariations.length > 0) {
      handleChange('imageUrl', newVariations[0]);
    }
    setIsBulkGenerating(false);
  };

  // === Upload de imagem de referência ===
  const handleAddRefImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (refInputRef.current) refInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 bg-[#0e111a] border border-white/10 p-6 rounded-3xl shadow-xl">
      {/* ============ SELETORES GLOBAIS ============ */}
      <div className="pb-5 border-b border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layout size={14} /> Estilo & Formato
          </span>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => onChangeAspectRatio('4:5')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                aspectRatio === '4:5' ? 'bg-brand-500 text-dark-900 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Feed 4:5
            </button>
            <button
              onClick={() => onChangeAspectRatio('1:1')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                aspectRatio === '1:1' ? 'bg-brand-500 text-dark-900 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Feed 1:1
            </button>
            <button
              onClick={() => onChangeAspectRatio('9:16')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                aspectRatio === '9:16' ? 'bg-brand-500 text-dark-900 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Story 9:16
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
            Tema Visual do Carrossel
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChangeTemplateStyle(opt.value)}
                className={`text-left px-3 py-2 rounded-xl border transition-all ${
                  templateStyle === opt.value
                    ? 'bg-brand-500/15 border-brand-500 text-white'
                    : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{opt.emoji}</span>
                  <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============ HEADER DO SLIDE ============ */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">
            Editando Slide {String(index + 1).padStart(2, '0')} de {String(totalSlides).padStart(2, '0')}
          </h3>
          <p className="text-xs text-gray-400">
            Tipo: {slide.type.toUpperCase()}
            {refinementHistory.length > 0 && (
              <span className="ml-2 text-purple-400">• {refinementHistory.length} refinamento(s)</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalSlides > 1 && (
            <button
              onClick={() => onDeleteSlide(slide.id)}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
              title="Excluir este slide"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={onAddSlide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
          >
            <Plus size={14} /> Adicionar Slide
          </button>
        </div>
      </div>

      {/* ============ CAMPOS DE TEXTO ============ */}
      <div className="space-y-4">
        {/* Tag */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
            Tag Superior (Categoria / Chamada)
          </label>
          <input
            type="text"
            value={slide.tag || ''}
            onChange={(e) => handleChange('tag', e.target.value)}
            placeholder="Ex: GUIA COMPLETO / METODOLOGIA"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Título */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
            Título Principal (Headline)
          </label>
          <textarea
            rows={2}
            value={slide.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs leading-relaxed focus:border-brand-500 focus:outline-none resize-none font-semibold"
          />
        </div>

        {/* Destaque */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
            Frase de Destaque (Cor da Marca)
          </label>
          <textarea
            rows={2}
            value={slide.highlightText || ''}
            onChange={(e) => handleChange('highlightText', e.target.value)}
            placeholder="Texto que receberá a cor de destaque primária..."
            className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-brand-400 text-xs leading-relaxed focus:border-brand-500 focus:outline-none resize-none font-medium"
          />
        </div>

        {/* Subtítulo */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
            Subtítulo / Explicação
          </label>
          <textarea
            rows={3}
            value={slide.subtitle || ''}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs leading-relaxed focus:border-brand-500 focus:outline-none resize-none"
          />
        </div>

        {/* ============ GERADOR DE IMAGEM DE FUNDO ============ */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={14} className="text-purple-400" /> Imagem de Fundo (IA)
            </label>
            {!apiKey ? (
              <button
                onClick={onOpenSettings}
                className="text-[10px] text-amber-400 hover:underline font-semibold"
              >
                Conectar Chave API
              </button>
            ) : (
              <span className="text-[10px] text-emerald-400 font-semibold">● API Ativa</span>
            )}
          </div>

          {/* Modelo selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-semibold focus:border-brand-500 focus:outline-none"
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value} className="bg-[#11131a]">
                {m.label}
              </option>
            ))}
          </select>

          {/* Imagem de referência (opcional) */}
          <input
            ref={refInputRef}
            type="file"
            accept="image/*"
            onChange={handleAddRefImage}
            className="hidden"
          />
          {referenceImage ? (
            <div className="relative">
              <img
                src={referenceImage}
                alt="ref"
                className="w-full h-16 object-cover rounded-md"
              />
              <button
                onClick={() => setReferenceImage(null)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                title="Remover referência"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => refInputRef.current?.click()}
              className="w-full text-[10px] text-gray-400 hover:text-brand-400 border border-dashed border-white/10 rounded-md py-1.5"
            >
              + Anexar imagem de referência (estilo/paleta)
            </button>
          )}

          {/* Prompt + botão de gerar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Ex: 3D geometric glass rendering, dark theme, professional..."
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={handleGenerateAiImage}
              disabled={isGeneratingImg}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all disabled:opacity-50"
            >
              {isGeneratingImg ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <Sparkles size={13} /> Gerar
                </>
              )}
            </button>
          </div>

          {/* Variações em massa */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={11} /> Variações em Massa
              </span>
              <select
                value={variationsCount}
                onChange={(e) => setVariationsCount(Number(e.target.value))}
                className="bg-transparent text-[10px] text-gray-300 focus:outline-none"
              >
                <option value={2} className="bg-[#11131a]">2x</option>
                <option value={4} className="bg-[#11131a]">4x</option>
                <option value={6} className="bg-[#11131a]">6x</option>
                <option value={8} className="bg-[#11131a]">8x</option>
              </select>
            </div>
            <button
              onClick={handleBulkGenerate}
              disabled={isBulkGenerating}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition-all disabled:opacity-50"
            >
              {isBulkGenerating ? (
                <>
                  <Loader2 size={11} className="animate-spin" /> Gerando {bulkProgress.current}/{bulkProgress.total}...
                </>
              ) : (
                <>
                  <Layers size={11} /> Gerar {variationsCount} Variações
                </>
              )}
            </button>
            {isBulkGenerating && (
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 transition-all"
                  style={{
                    width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Refinamento iterativo (só se já tem imagem) */}
          {slide.imageUrl && (
            <div className="pt-2 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 size={11} /> Refinar Imagem Atual
              </span>
              <input
                type="text"
                value={refineInstruction}
                onChange={(e) => setRefineInstruction(e.target.value)}
                placeholder="Ex: mude a iluminação para azul neon"
                className="w-full px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-white text-[11px] focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={handleRefine}
                disabled={isRefining || !refineInstruction.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all disabled:opacity-50"
              >
                {isRefining ? (
                  <>
                    <Loader2 size={11} className="animate-spin" /> Refinando...
                  </>
                ) : (
                  <>
                    <Wand2 size={11} /> Refinar Imagem
                  </>
                )}
              </button>
              {refinementHistory.length > 0 && (
                <div className="grid grid-cols-4 gap-1">
                  {refinementHistory.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => handleChange('imageUrl', h.result)}
                      className="relative group"
                      title={h.instruction}
                    >
                      <img
                        src={h.result}
                        alt={`v${i + 1}`}
                        className="w-full aspect-square object-cover rounded border border-white/10 hover:border-purple-500"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-purple-500 text-[8px] text-white text-center py-0.5 opacity-0 group-hover:opacity-100 truncate px-1">
                        {h.instruction}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {imgError && (
            <p className="text-[11px] text-red-400 font-medium">{imgError}</p>
          )}

          {slide.imageUrl && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-400">Imagem aplicada ao fundo</span>
              <button
                onClick={() => handleChange('imageUrl', undefined)}
                className="text-[11px] text-red-400 hover:underline"
              >
                Remover imagem
              </button>
            </div>
          )}
        </div>

        {/* Bullets / Itens da Lista */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-gray-400">
              Checklist / Pontos do Slide
            </label>
            <button
              onClick={handleAddBullet}
              className="text-[11px] font-bold text-brand-400 hover:text-brand-300 transition-colors"
            >
              + Item
            </button>
          </div>

          <div className="space-y-2">
            {(slide.bodyList || []).map((bullet, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => handleBodyListChange(idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
                />
                <button
                  onClick={() => handleRemoveBullet(idx)}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Botão de Ação / CTA */}
        {slide.type === 'cta' && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Texto do Botão de Chamada para Ação
            </label>
            <input
              type="text"
              value={slide.ctaButton || ''}
              onChange={(e) => handleChange('ctaButton', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
        )}

        {/* TEXTOS PERSONALIZADOS DO HEADER E FOOTER */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              ✏️ Textos Editáveis do Slide
            </p>
            <button
              onClick={() => {
                if (confirm('Resetar todos os textos para o padrão?')) {
                  handleChange('topBadge', '');
                  handleChange('bottomLeft', '');
                  handleChange('bottomRight', '');
                }
              }}
              className="text-[9px] text-gray-500 hover:text-red-400"
            >
              Limpar tudo
            </button>
          </div>

          {/* Toggle: Top Badge */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-gray-400">
                Badge Superior
                {slide.type === 'cover' && <span className="ml-1 text-[9px] text-amber-400">(só cover)</span>}
              </label>
              {slide.topBadge && (
                <button
                  onClick={() => handleChange('topBadge', '')}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
            {slide.topBadge !== '' || slide.type !== 'cover' ? (
              <input
                type="text"
                value={slide.topBadge || ''}
                onChange={(e) => handleChange('topBadge', e.target.value)}
                placeholder="🔥 Post Novo"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => handleChange('topBadge', '🔥 Post Novo')}
                className="w-full text-[11px] text-emerald-400 border border-dashed border-emerald-500/30 rounded-md py-1.5 hover:bg-emerald-500/10"
              >
                + Adicionar badge
              </button>
            )}
          </div>

          {/* Toggle: Bottom Left */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-gray-400">Texto Inferior Esquerdo</label>
              {slide.bottomLeft && (
                <button
                  onClick={() => handleChange('bottomLeft', '')}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
            {slide.bottomLeft !== '' ? (
              <input
                type="text"
                value={slide.bottomLeft || ''}
                onChange={(e) => handleChange('bottomLeft', e.target.value)}
                placeholder="DESLIZE PARA VER O PASSO A PASSO →"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => handleChange('bottomLeft', 'Arraste para o lado ➔')}
                className="w-full text-[11px] text-emerald-400 border border-dashed border-emerald-500/30 rounded-md py-1.5 hover:bg-emerald-500/10"
              >
                + Adicionar texto
              </button>
            )}
          </div>

          {/* Toggle: Bottom Right */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-gray-400">Texto Inferior Direito</label>
              {slide.bottomRight && (
                <button
                  onClick={() => handleChange('bottomRight', '')}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
            {slide.bottomRight !== '' ? (
              <input
                type="text"
                value={slide.bottomRight || ''}
                onChange={(e) => handleChange('bottomRight', e.target.value)}
                placeholder="📌 Salvar post"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => handleChange('bottomRight', 'Salvar post')}
                className="w-full text-[11px] text-emerald-400 border border-dashed border-emerald-500/30 rounded-md py-1.5 hover:bg-emerald-500/10"
              >
                + Adicionar texto
              </button>
            )}
          </div>

          {/* Sliders de posição livre para textos */}
          <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mt-3 mb-1">
            📐 Posições X/Y dos Textos (opcional)
          </p>

          {/* Tag position */}
          {slide.tag !== '' && (
            <PosControl
              label="Tag"
              pos={slide.tagPos}
              onChange={(p) => handleChange('tagPos', p)}
            />
          )}
          {/* Title position */}
          {slide.title !== '' && (
            <PosControl
              label="Título"
              pos={slide.titlePos}
              onChange={(p) => handleChange('titlePos', p)}
            />
          )}
          {/* Highlight position */}
          {slide.highlightText && slide.highlightText !== '' && (
            <PosControl
              label="Destaque"
              pos={slide.highlightPos}
              onChange={(p) => handleChange('highlightPos', p)}
            />
          )}
          {/* Subtitle position */}
          {slide.subtitle && slide.subtitle !== '' && (
            <PosControl
              label="Subtítulo"
              pos={slide.subtitlePos}
              onChange={(p) => handleChange('subtitlePos', p)}
            />
          )}
          {/* CTA position */}
          {slide.ctaButton && (
            <PosControl
              label="CTA"
              pos={slide.ctaPos}
              onChange={(p) => handleChange('ctaPos', p)}
            />
          )}
          {/* BodyList position */}
          {slide.bodyList && slide.bodyList.length > 0 && (
            <PosControl
              label="Lista"
              pos={slide.bodyListPos}
              onChange={(p) => handleChange('bodyListPos', p)}
            />
          )}

          {/* Acoes globais */}
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              🎛️ Visibilidade do Slide
            </p>
            <ToggleRow
              label="Mostrar Imagem de Fundo"
              active={!!slide.imageUrl}
              onChange={(v) => { if (!v) handleChange('imageUrl', undefined); }}
            />
            <ToggleRow
              label="Mostrar Tag Superior"
              active={!!(slide.tag && slide.tag.length > 0)}
              onChange={(v) => handleChange('tag', v ? (slide.tag || 'MÉTODO EXCLUSIVO') : '')}
            />
            <ToggleRow
              label="Mostrar Destaque"
              active={!!(slide.highlightText && slide.highlightText.length > 0)}
              onChange={(v) => handleChange('highlightText', v ? (slide.highlightText || 'Sem gastar mais em tráfego') : '')}
            />
            <ToggleRow
              label="Mostrar Subtítulo"
              active={!!(slide.subtitle && slide.subtitle.length > 0)}
              onChange={(v) => handleChange('subtitle', v ? (slide.subtitle || 'Texto de exemplo...') : '')}
            />
            <ToggleRow
              label="Mostrar Lista de Bullets"
              active={!!(slide.bodyList && slide.bodyList.length > 0)}
              onChange={(v) =>
                handleChange(
                  'bodyList',
                  v
                    ? (slide.bodyList && slide.bodyList.length > 0
                        ? slide.bodyList
                        : ['Primeiro ponto', 'Segundo ponto', 'Terceiro ponto'])
                    : []
                )
              }
            />
            <ToggleRow
              label="Mostrar Botão CTA"
              active={!!(slide.ctaButton && slide.ctaButton.length > 0)}
              onChange={(v) => handleChange('ctaButton', v ? (slide.ctaButton || 'QUERO APRENDER AGORA') : '')}
            />
            <ToggleRow
              label="Mostrar Header (marca + slide #)"
              active={true}
              disabled
            />
            <ToggleRow
              label="Mostrar Footer (textos editáveis)"
              active={
                !!(slide.bottomLeft || slide.bottomRight) ||
                !!slide.badge
              }
              onChange={(v) => {
                if (!v) {
                  handleChange('bottomLeft', '');
                  handleChange('bottomRight', '');
                } else {
                  handleChange('bottomLeft', 'Arraste para o lado ➔');
                  handleChange('bottomRight', 'Salvar post');
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Galeria de imagens geradas */}
      {generatedGallery.length > 0 && (
        <div className="pt-3 border-t border-white/10">
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2"
          >
            <span className="flex items-center gap-1.5">
              <ImageIcon size={12} /> Galeria ({generatedGallery.length})
            </span>
            <span>{showGallery ? '▲' : '▼'}</span>
          </button>
          {showGallery && (
            <div className="grid grid-cols-4 gap-2">
              {generatedGallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => handleChange('imageUrl', img)}
                  className="relative group rounded overflow-hidden border border-white/10 hover:border-brand-500"
                >
                  <img src={img} alt="" className="w-full aspect-square object-cover" />
                  {img === slide.imageUrl && (
                    <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                      <Check size={16} className="text-brand-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
