import React, { useState } from 'react';
import { CarouselSlide, TemplateStyle } from '@/types';
import { Type, Sparkles, Plus, Trash2, Layout, Sliders, ChevronDown, Image as ImageIcon, Loader2 } from 'lucide-react';

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
  provider: 'openai' | 'Opus 4.8';
}

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
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const handleGenerateAiImage = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }
    const promptToUse =
      imagePrompt ||
      `Professional 3D glassmorphism abstract background illustration, dark aesthetic, theme: ${slide.title}`;

    setIsGeneratingImg(true);
    setImgError(null);

    try {
      const endpoint = '/api/generate-image';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          apiKey,
          size: '1024x1024',
          aspectRatio: '1:1',
          provider: provider === 'Opus 4.8' ? 'Opus 4.8' : 'openai',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar imagem.');
      }
      handleChange('imageUrl', data.imageUrl);
    } catch (err: any) {
      setImgError(err.message || `Erro ao conectar ao ${provider === 'Opus 4.8' ? 'Opus 4.8' : 'OpenAI'}.`);
    } finally {
      setIsGeneratingImg(false);
    }
  };
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

  return (
    <div className="space-y-6 bg-[#0e111a] border border-white/10 p-6 rounded-3xl shadow-xl">
      {/* SELETORES GLOBAIS DE DESIGN */}
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
          <select
            value={templateStyle}
            onChange={(e) => onChangeTemplateStyle(e.target.value as TemplateStyle)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none"
          >
            <option value="tech-modern" className="bg-[#11131a]">Tech Modern (Glows & Grid)</option>
            <option value="glassmorphism" className="bg-[#11131a]">Glassmorphism (Vidro & Desfoque)</option>
            <option value="neo-brutalist" className="bg-[#11131a]">Neo Brutalist (Bordas fortes & Alto Contraste)</option>
            <option value="minimalist-dark" className="bg-[#11131a]">Minimalist Dark (Tipografia limpa)</option>
          </select>
        </div>
      </div>

      {/* HEADER DA EDIÇÃO DO SLIDE ATUAL */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">
            Editando Slide {String(index + 1).padStart(2, '0')} de {String(totalSlides).padStart(2, '0')}
          </h3>
          <p className="text-xs text-gray-400">Tipo de tela: {slide.type.toUpperCase()}</p>
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

      {/* CAMPOS DO SLIDE */}
      <div className="space-y-4">
        {/* Tag / Categoria Superior */}
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

        {/* Título Principal */}
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

        {/* Texto de Destaque Colorido */}
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

        {/* Gerador de Imagem/Fundo por IA (OpenAI) */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={14} className="text-purple-400" /> Imagem de Fundo (IA OpenAI)
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

          <div className="flex gap-2">
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Ex: 3D geometric abstract glass rendering, dark background..."
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
      </div>
    </div>
  );
};
