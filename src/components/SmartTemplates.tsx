import React from 'react';
import {
  TemplateStyle,
} from '@/types';

// =====================================
// SISTEMA DE TEMPLATES AUTOMATICOS
// Cada template e uma composicao profissional pre-pronta
// que o sistema preenche com o briefing do usuario
// =====================================

export interface SmartTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'editorial' | 'promocional' | 'minimalista' | 'hero' | 'autoridade' | 'storytelling';
  // Aspect ratio recomendado
  preferredAspect: ('4:5' | '1:1' | '9:16' | '16:9')[];
  // Função que retorna a config completa dado o briefing
  buildConfig: (briefing: BriefInput) => TemplateConfig;
  // Preview visual
  previewStyle: {
    bgGradient: string;
    pattern?: string;
  };
}

export interface BriefInput {
  product: string;       // nome do produto/serviço
  audience: string;     // público-alvo (ex: "empreendedores", "mães")
  pain: string;          // dor principal (ex: "juros altos", "perda de tempo")
  benefit: string;       // benefício principal (ex: "economizar", "vender mais")
  tone: string;          // tom (urgente, inspirador, profissional, casual, luxo)
  cta?: string;          // call-to-action personalizado
  brand: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  };
}

export interface TemplateConfig {
  // Posicionamento de cada elemento (em % do canvas)
  layout: {
    tagPosition: { x: number; y: number; align: 'left' | 'center' | 'right' };
    headlinePosition: { x: number; y: number; align: 'left' | 'center' | 'right' };
    highlightPosition: { x: number; y: number; align: 'left' | 'center' | 'right' };
    sublinePosition: { x: number; y: number; align: 'left' | 'center' | 'right' };
    ctaPosition: { x: number; y: number; align: 'left' | 'center' | 'right' };
  };
  // Tipografia inteligente
  typography: {
    tagSize: number; tagWeight: '700' | '800' | '900'; tagCaps: boolean;
    headlineSize: number; headlineWeight: '700' | '800' | '900';
    highlightSize: number;
    sublineSize: number;
    ctaSize: number; ctaWeight: '700' | '800' | '900'; ctaCaps: boolean;
  };
  // Textos gerados a partir do briefing
  texts: {
    tag: string;             // ex: "MÉTODO EXCLUSIVO"
    headline: string;        // ex: briefing.headline ou gerado
    highlight: string;       // ex: briefing.benefit em caps
    subline: string;         // ex: "Para " + audience
    cta: string;             // ex: "QUERO APRENDER AGORA"
  };
  // Efeitos visuais
  visual: {
    useGradientBg: boolean;
    gradientColor1: string;
    gradientColor2: string;
    gradientAngle: number;
    glowIntensity: number;
    useHighlightBox: boolean; // caixa amarela atrás de palavra-chave
    highlightBoxWord: string;
  };
}

// =====================================
// HELPERS DE GERAÇÃO
// =====================================

function generateHeadline(b: BriefInput): string {
  // Gera headline baseado no beneficio
  if (b.benefit) {
    const benefit = b.benefit.toUpperCase();
    if (b.pain) {
      return `PARE DE ${b.pain.toUpperCase()} E COMECE A ${benefit}`;
    }
    return `DESCUBRA COMO ${benefit.toUpperCase()}`;
  }
  if (b.pain) {
    return `${b.product.toUpperCase()}: A SOLUÇÃO PARA ${b.pain.toUpperCase()}`;
  }
  return `${b.product.toUpperCase()}`;
}

function generateHighlight(b: BriefInput): string {
  if (b.benefit) return b.benefit.toUpperCase();
  return 'RESULTADO COMPROVADO';
}

function generateSubline(b: BriefInput): string {
  if (b.audience) {
    return `Para ${b.audience} que querem resultados reais em 2026.`;
  }
  return 'Método testado e aprovado por milhares.';
}

function generateCTA(b: BriefInput): string {
  if (b.cta) return b.cta.toUpperCase();
  const ctasPorTom: Record<string, string> = {
    urgente: 'GARANTIR MINHA VAGA AGORA',
    inspirador: 'QUERO COMEÇAR AGORA',
    profissional: 'SOLICITAR ACESSO',
    casual: 'VEM CONFERIR!',
    luxo: 'AGENDAR MINHA CONSULTA',
  };
  return ctasPorTom[b.tone] || 'QUERO SABER MAIS';
}

function generateTag(b: BriefInput): string {
  if (b.tone === 'luxo') return 'EXCLUSIVO PREMIUM';
  if (b.tone === 'urgente') return 'ÚLTIMAS VAGAS';
  if (b.tone === 'profissional') return 'MÉTODO COMPROVADO';
  return 'NOVIDADE 2026';
}

// =====================================
// 6 TEMPLATES PROFISSIONAIS
// =====================================

const t1_EditorialHero: SmartTemplate = {
  id: 'editorial-hero',
  name: 'Editorial Hero',
  description: 'Headline grande + CTA visível. Layout clássico de revista premium.',
  emoji: '📰',
  category: 'editorial',
  preferredAspect: ['4:5', '1:1', '16:9'],
  previewStyle: {
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  },
  buildConfig: (b) => ({
    layout: {
      tagPosition: { x: 5, y: 5, align: 'left' },
      headlinePosition: { x: 5, y: 50, align: 'left' },
      highlightPosition: { x: 5, y: 70, align: 'left' },
      sublinePosition: { x: 5, y: 85, align: 'left' },
      ctaPosition: { x: 5, y: 95, align: 'left' },
    },
    typography: {
      tagSize: 14, tagWeight: '800', tagCaps: true,
      headlineSize: 52, headlineWeight: '900',
      highlightSize: 28,
      sublineSize: 16,
      ctaSize: 18, ctaWeight: '800', ctaCaps: true,
    },
    texts: {
      tag: generateTag(b),
      headline: generateHeadline(b),
      highlight: generateHighlight(b),
      subline: generateSubline(b),
      cta: generateCTA(b),
    },
    visual: {
      useGradientBg: true,
      gradientColor1: b.brand.backgroundColor || '#0f172a',
      gradientColor2: '#000000',
      gradientAngle: 135,
      glowIntensity: 40,
      useHighlightBox: true,
      highlightBoxWord: b.benefit.split(' ')[0] || 'RESULTADO',
    },
  }),
};

const t2_PromoCenter: SmartTemplate = {
  id: 'promo-center',
  name: 'Promo Center',
  description: 'Tudo centralizado. Ideal para ofertas com CTA forte embaixo.',
  emoji: '🎯',
  category: 'promocional',
  preferredAspect: ['1:1', '4:5', '9:16'],
  previewStyle: {
    bgGradient: 'linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)',
  },
  buildConfig: (b) => ({
    layout: {
      tagPosition: { x: 50, y: 8, align: 'center' },
      headlinePosition: { x: 50, y: 35, align: 'center' },
      highlightPosition: { x: 50, y: 55, align: 'center' },
      sublinePosition: { x: 50, y: 75, align: 'center' },
      ctaPosition: { x: 50, y: 92, align: 'center' },
    },
    typography: {
      tagSize: 16, tagWeight: '900', tagCaps: true,
      headlineSize: 44, headlineWeight: '900',
      highlightSize: 24,
      sublineSize: 14,
      ctaSize: 22, ctaWeight: '900', ctaCaps: true,
    },
    texts: {
      tag: 'OFERTA ESPECIAL',
      headline: `${b.product.toUpperCase()} POR APENAS`,
      highlight: `R$ [VALOR]`,
      subline: 'Vagas limitadas. Garanta a sua agora.',
      cta: 'QUERO APROVEITAR',
    },
    visual: {
      useGradientBg: true,
      gradientColor1: '#dc2626',
      gradientColor2: '#7f1d1d',
      gradientAngle: 180,
      glowIntensity: 50,
      useHighlightBox: true,
      highlightBoxWord: 'R$',
    },
  }),
};

const t3_MinimalClean: SmartTemplate = {
  id: 'minimal-clean',
  name: 'Minimal Clean',
  description: 'Minimalista com tipografia elegante. Fundo predominantemente branco.',
  emoji: '◯',
  category: 'minimalista',
  preferredAspect: ['1:1', '4:5', '16:9'],
  previewStyle: {
    bgGradient: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)',
  },
  buildConfig: (b) => ({
    layout: {
      tagPosition: { x: 8, y: 10, align: 'left' },
      headlinePosition: { x: 8, y: 45, align: 'left' },
      highlightPosition: { x: 8, y: 62, align: 'left' },
      sublinePosition: { x: 8, y: 78, align: 'left' },
      ctaPosition: { x: 8, y: 92, align: 'left' },
    },
    typography: {
      tagSize: 12, tagWeight: '700', tagCaps: true,
      headlineSize: 42, headlineWeight: '700',
      highlightSize: 22,
      sublineSize: 14,
      ctaSize: 16, ctaWeight: '700', ctaCaps: true,
    },
    texts: {
      tag: 'MARCAS PREMIUM',
      headline: b.product,
      highlight: b.benefit,
      subline: b.audience ? `Para ${b.audience}.` : '',
      cta: b.cta || 'Saiba mais',
    },
    visual: {
      useGradientBg: false,
      gradientColor1: '#ffffff',
      gradientColor2: '#f5f5f5',
      gradientAngle: 180,
      glowIntensity: 0,
      useHighlightBox: false,
      highlightBoxWord: '',
    },
  }),
};

const t4_HeroBottom: SmartTemplate = {
  id: 'hero-bottom',
  name: 'Hero Bottom (Pessoa + Texto embaixo)',
  description: 'Layout clássico com imagem no topo e copy embaixo. Comprovadamente converte.',
  emoji: '🦸',
  category: 'hero',
  preferredAspect: ['4:5', '1:1', '16:9'],
  previewStyle: {
    bgGradient: 'linear-gradient(180deg, #f3f4f6 0%, #1f2937 100%)',
  },
  buildConfig: (b) => ({
    layout: {
      tagPosition: { x: 5, y: 5, align: 'left' },
      headlinePosition: { x: 50, y: 78, align: 'center' },
      highlightPosition: { x: 50, y: 86, align: 'center' },
      sublinePosition: { x: 50, y: 92, align: 'center' },
      ctaPosition: { x: 50, y: 98, align: 'center' },
    },
    typography: {
      tagSize: 14, tagWeight: '800', tagCaps: true,
      headlineSize: 40, headlineWeight: '900',
      highlightSize: 22,
      sublineSize: 14,
      ctaSize: 18, ctaWeight: '800', ctaCaps: true,
    },
    texts: {
      tag: generateTag(b),
      headline: generateHeadline(b),
      highlight: generateHighlight(b),
      subline: '',
      cta: generateCTA(b),
    },
    visual: {
      useGradientBg: false,
      gradientColor1: '#1f2937',
      gradientColor2: '#000000',
      gradientAngle: 180,
      glowIntensity: 30,
      useHighlightBox: true,
      highlightBoxWord: b.benefit.split(' ')[0] || '',
    },
  }),
};

const t5_AuthoritySide: SmartTemplate = {
  id: 'authority-side',
  name: 'Autoridade Lateral',
  description: 'Texto à esquerda, badge de prova social à direita. Perfeito para serviços B2B.',
  emoji: '🏆',
  category: 'autoridade',
  preferredAspect: ['16:9', '4:5'],
  previewStyle: {
    bgGradient: 'linear-gradient(90deg, #0c4a6e 0%, #082f49 100%)',
  },
  buildConfig: (b) => ({
    layout: {
      tagPosition: { x: 5, y: 8, align: 'left' },
      headlinePosition: { x: 5, y: 30, align: 'left' },
      highlightPosition: { x: 5, y: 50, align: 'left' },
      sublinePosition: { x: 5, y: 70, align: 'left' },
      ctaPosition: { x: 5, y: 88, align: 'left' },
    },
    typography: {
      tagSize: 13, tagWeight: '700', tagCaps: true,
      headlineSize: 36, headlineWeight: '800',
      highlightSize: 20,
      sublineSize: 14,
      ctaSize: 16, ctaWeight: '800', ctaCaps: true,
    },
    texts: {
      tag: 'MAIS DE 10.000 ALUNOS',
      headline: `${b.product.toUpperCase()}`,
      highlight: b.benefit.toUpperCase(),
      subline: b.audience ? `Para ${b.audience} que buscam excelência.` : '',
      cta: generateCTA(b),
    },
    visual: {
      useGradientBg: true,
      gradientColor1: '#0c4a6e',
      gradientColor2: '#082f49',
      gradientAngle: 90,
      glowIntensity: 25,
      useHighlightBox: true,
      highlightBoxWord: '10.000',
    },
  }),
};

const t6_StoryPunch: SmartTemplate = {
  id: 'story-punch',
  name: 'Story Punch (Vertical)',
  description: 'Vertical para Stories/Reels. Headline grande no topo + CTA fixo embaixo.',
  emoji: '📱',
  category: 'storytelling',
  preferredAspect: ['9:16'],
  previewStyle: {
    bgGradient: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
  },
  buildConfig: (b) => ({
    layout: {
      tagPosition: { x: 50, y: 5, align: 'center' },
      headlinePosition: { x: 50, y: 35, align: 'center' },
      highlightPosition: { x: 50, y: 55, align: 'center' },
      sublinePosition: { x: 50, y: 75, align: 'center' },
      ctaPosition: { x: 50, y: 95, align: 'center' },
    },
    typography: {
      tagSize: 18, tagWeight: '900', tagCaps: true,
      headlineSize: 48, headlineWeight: '900',
      highlightSize: 28,
      sublineSize: 18,
      ctaSize: 22, ctaWeight: '900', ctaCaps: true,
    },
    texts: {
      tag: 'TOQUE E DESCUBRA',
      headline: generateHeadline(b),
      highlight: generateHighlight(b),
      subline: 'Arraste para cima ↑',
      cta: generateCTA(b),
    },
    visual: {
      useGradientBg: true,
      gradientColor1: '#fbbf24',
      gradientColor2: '#d97706',
      gradientAngle: 180,
      glowIntensity: 60,
      useHighlightBox: true,
      highlightBoxWord: 'TOQUE',
    },
  }),
};

export const AVAILABLE_TEMPLATES: SmartTemplate[] = [
  t1_EditorialHero,
  t2_PromoCenter,
  t3_MinimalClean,
  t4_HeroBottom,
  t5_AuthoritySide,
  t6_StoryPunch,
];

// =====================================
// Componente UI - Galeria de Templates
// =====================================

interface SmartTemplatesProps {
  onApplyTemplate: (template: SmartTemplate, config: TemplateConfig) => void;
}

export const SmartTemplates: React.FC<SmartTemplatesProps> = ({ onApplyTemplate }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [showBriefingForm, setShowBriefingForm] = React.useState(false);
  const [briefing, setBriefing] = React.useState<BriefInput>({
    product: '',
    audience: '',
    pain: '',
    benefit: '',
    tone: 'urgente',
    cta: '',
    brand: {
      primaryColor: '#10b981',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#94a3b8',
    },
  });
  const [selectedTemplate, setSelectedTemplate] = React.useState<SmartTemplate | null>(null);

  const categories = ['all', 'editorial', 'promocional', 'minimalista', 'hero', 'autoridade', 'storytelling'];
  const filteredTemplates = selectedCategory === 'all'
    ? AVAILABLE_TEMPLATES
    : AVAILABLE_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleApply = (template: SmartTemplate) => {
    if (!briefing.product.trim()) {
      alert('Preencha pelo menos o campo "Produto/Servico" antes de aplicar.');
      return;
    }
    const config = template.buildConfig(briefing);
    onApplyTemplate(template, config);
    setSelectedTemplate(template);
    setShowBriefingForm(false);
  };

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 via-brand-500/5 to-cyan-500/5 border border-purple-500/20 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            🎨 Templates Automáticos com IA
            <span className="text-[9px] font-mono bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">BETA</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Escolha um template, preencha o briefing, e o sistema aplica tudo automaticamente.
          </p>
        </div>
        <button
          onClick={() => setShowBriefingForm(!showBriefingForm)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10"
        >
          {showBriefingForm ? 'Ocultar' : '📝 Briefing'}
        </button>
      </div>

      {/* FILTROS POR CATEGORIA */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
              selectedCategory === cat
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {cat === 'all' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      {/* FORM DE BRIEFING */}
      {showBriefingForm && (
        <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Produto/Servico *
              </label>
              <input
                type="text"
                value={briefing.product}
                onChange={(e) => setBriefing({ ...briefing, product: e.target.value })}
                placeholder="Ex: Curso de Marketing Digital"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Publico-alvo
              </label>
              <input
                type="text"
                value={briefing.audience}
                onChange={(e) => setBriefing({ ...briefing, audience: e.target.value })}
                placeholder="Ex: Empreendedores iniciantes"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Dor / Problema
              </label>
              <input
                type="text"
                value={briefing.pain}
                onChange={(e) => setBriefing({ ...briefing, pain: e.target.value })}
                placeholder="Ex: Nao consegue clientes"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Beneficio / Solucao
              </label>
              <input
                type="text"
                value={briefing.benefit}
                onChange={(e) => setBriefing({ ...briefing, benefit: e.target.value })}
                placeholder="Ex: Vender 10x mais"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Tom de comunicacao
              </label>
              <select
                value={briefing.tone}
                onChange={(e) => setBriefing({ ...briefing, tone: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none"
              >
                <option value="urgente" className="bg-[#11131a]">🔥 Urgente</option>
                <option value="inspirador" className="bg-[#11131a]">✨ Inspirador</option>
                <option value="profissional" className="bg-[#11131a]">💼 Profissional</option>
                <option value="casual" className="bg-[#11131a]">😄 Casual</option>
                <option value="luxo" className="bg-[#11131a]">👑 Luxo</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                CTA customizado (opcional)
              </label>
              <input
                type="text"
                value={briefing.cta || ''}
                onChange={(e) => setBriefing({ ...briefing, cta: e.target.value })}
                placeholder="Ex: Quero meu ebook gratis"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* GALERIA DE TEMPLATES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`rounded-2xl border-2 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer ${
              selectedTemplate?.id === template.id
                ? 'border-purple-500 ring-2 ring-purple-400 ring-offset-2 ring-offset-[#0e111a]'
                : 'border-white/10 hover:border-purple-500/50'
            }`}
            onClick={() => handleApply(template)}
          >
            <div
              className="aspect-video relative"
              style={{ background: template.previewStyle.bgGradient }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-40">
                {template.emoji}
              </div>
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm text-[9px] font-bold text-white uppercase">
                {template.category}
              </div>
            </div>
            <div className="p-3 bg-[#0e111a]">
              <h4 className="text-sm font-bold text-white">{template.name}</h4>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight line-clamp-2">{template.description}</p>
              <div className="flex items-center gap-1 mt-2">
                {template.preferredAspect.map((ar) => (
                  <span key={ar} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-gray-400 font-mono">
                    {ar}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status do template selecionado */}
      {selectedTemplate && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-300 font-bold">
            Template "{selectedTemplate.name}" aplicado! Veja o canvas a esquerda.
          </span>
        </div>
      )}
    </div>
  );
};

// Re-exportar Check para uso interno
import { Check } from 'lucide-react';
