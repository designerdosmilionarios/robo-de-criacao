import React, { useState, useEffect } from 'react';
import { BrandKit, AdVariation } from '@/types';
import { Copy, Sparkles, Download, Layers, Check, LayoutGrid, Sliders, Save } from 'lucide-react';
import { toPng } from 'html-to-image';
import saveAs from 'file-saver';

interface AdBatchGeneratorProps {
  brand: BrandKit;
  onSaveRequest?: (payload: { name: string }) => void;
}

export const AdBatchGenerator: React.FC<AdBatchGeneratorProps> = ({ brand, onSaveRequest }) => {
  const [productTopic, setProductTopic] = useState('Consórcio Imobiliário sem Juros');
  const [targetPain, setTargetPain] = useState('Juros abusivos de financiamento bancário');
  const [selectedFormat, setSelectedFormat] = useState<'4:5' | '1:1' | '9:16'>('4:5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [variations, setVariations] = useState<AdVariation[]>([
    {
      id: 'var-1',
      tag: 'OPORTUNIDADE 2026',
      headline: 'Pare de pagar 3 apartamentos para o banco no financiamento.',
      subheadline: 'Descubra como o consórcio estruturado permite planejar seu imóvel pagando até 60% menos no custo total.',
      cta: 'SIMULAR PARCELAS NO WHATSAPP ➔',
      badge: 'TAXA ZERO DE JUROS',
      bgGradient: 'from-dark-900 to-dark-800',
    },
    {
      id: 'var-2',
      tag: 'PLANEJAMENTO FINANCEIRO',
      headline: 'A sua casa própria não precisa vir acompanhada de uma dívida de 35 anos.',
      subheadline: 'Cartas de crédito de R$ 300k a R$ 1.5M com parcelas que cabem com folga no seu orçamento mensal.',
      cta: 'QUERO FALAR COM UM ESPECIALISTA ➔',
      badge: 'PLANEJAMENTO PERSONALIZADO',
      bgGradient: 'from-[#0b101b] to-dark-900',
    },
    {
      id: 'var-3',
      tag: 'ALERTA IMPORTANTE',
      headline: 'Se você tem score bom, o banco quer te prender nos juros.',
      subheadline: 'Quem entende de dinheiro usa alavancagem inteligente para construir patrimônio sólido.',
      cta: 'VER COMPARATIVO COMPLETO ➔',
      badge: 'ESTRATÉGIA DE ALTO NÍVEL',
      bgGradient: 'from-dark-800 to-[#11131c]',
    },
    {
      id: 'var-4',
      tag: 'CONSTRUÇÃO DE PATRIMÔNIO',
      headline: 'Multiplique seu capital imobiliário sem descapitalizar seu caixa.',
      subheadline: 'Estratégia sob medida para investidores e empresários que valorizam liquidez e rentabilidade.',
      cta: 'RECEBER PROPOSTA EXCLUSIVA ➔',
      badge: 'ATENDIMENTO PREMIUM',
      bgGradient: 'from-dark-900 to-[#0e1726]',
    },
  ]);

  const handleGenerateBatch = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setVariations([
        {
          id: `var-${Date.now()}-1`,
          tag: 'DOR PRINCIPAL',
          headline: `Cansado de lidar com ${targetPain.toLowerCase()}?`,
          subheadline: `A forma inteligente de conquistar ${productTopic.toLowerCase()} com condições exclusivas para este mês.`,
          cta: 'QUERO SABER MAIS NO DIRECT ➔',
          badge: 'CONDIÇÃO ESPECIAL',
          bgGradient: 'from-dark-900 to-dark-800',
        },
        {
          id: `var-${Date.now()}-2`,
          tag: 'QUEBRA DE OBJEÇÃO',
          headline: 'O que ninguém te conta sobre o jeito tradicional do mercado.',
          subheadline: 'Existe um atalho comprovado para ter mais resultado gastando muito menos tempo e dinheiro.',
          cta: 'SOLICITAR CONSULTORIA GRATUITA ➔',
          badge: 'VAGAS LIMITADAS',
          bgGradient: 'from-[#0b101b] to-dark-900',
        },
        {
          id: `var-${Date.now()}-3`,
          tag: 'AUTORIDADE MÁXIMA',
          headline: 'Mais de 500 clientes já transformaram seus resultados conosco.',
          subheadline: 'Metodologia testada, sem letras miúdas e com transparência total do início ao fim.',
          cta: 'FALE COM NOSSO TIME ➔',
          badge: 'COMPROVADO',
          bgGradient: 'from-dark-800 to-[#11131c]',
        },
        {
          id: `var-${Date.now()}-4`,
          tag: 'OFERTA DIRETA',
          headline: 'Dê o primeiro passo hoje mesmo antes da virada de lote.',
          subheadline: 'Garantimos as melhores taxas e suporte consultivo individual para o seu perfil.',
          cta: 'GARANTIR MINHA CONDIÇÃO ➔',
          badge: 'OPORTUNIDADE ÚNICA',
          bgGradient: 'from-dark-900 to-[#0e1726]',
        },
      ]);
      setIsGenerating(false);
    }, 700);
  };

  const handleDownloadAd = async (id: string, index: number) => {
    const el = document.getElementById(`ad-canvas-${id}`);
    if (!el) return;
    setDownloadingId(id);
    try {
      const dataUrl = await toPng(el, { pixelRatio: 2.5, cacheBust: true });
      saveAs(dataUrl, `anuncio-${brand.name.toLowerCase().replace(/\s+/g, '-')}-${index + 1}.png`);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* PAINEL DE CONTROLE DE BATCH */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0e111a] border border-white/10 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gerador de Variações em Lote (Meta Ads)</h2>
              <p className="text-sm text-gray-400">
                Gere múltiplos criativos com ângulos diferentes mantendo a identidade visual do cliente{' '}
                <span className="text-brand-400 font-semibold">{brand.name}</span>.
              </p>
            </div>
          </div>

          {/* Formato do Anúncio */}
          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setSelectedFormat('4:5')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedFormat === '4:5' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Feed 4:5
            </button>
            <button
              onClick={() => setSelectedFormat('1:1')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedFormat === '1:1' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Feed 1:1
            </button>
            <button
              onClick={() => setSelectedFormat('9:16')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedFormat === '9:16' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Story 9:16
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
              Produto / Serviço Oferecido
            </label>
            <input
              type="text"
              value={productTopic}
              onChange={(e) => setProductTopic(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
              Principal Dor / Objeção do Lead
            </label>
            <input
              type="text"
              value={targetPain}
              onChange={(e) => setTargetPain(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
          {onSaveRequest && (
            <button
              onClick={() => onSaveRequest({ name: `Lote - ${productTopic.substring(0, 30)}` })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
            >
              <Save size={14} /> Salvar Lote
            </button>
          )}
          <button
            onClick={handleGenerateBatch}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-brand-500 text-dark-900 hover:bg-brand-400 transition-all shadow-xl disabled:opacity-50 ml-auto"
          >
            <Sparkles size={16} />
            {isGenerating ? 'Criando Ângulos com IA...' : 'Gerar 4 Variações de Teste A/B'}
          </button>
        </div>
      </div>

      {/* GRID DE CRIATIVOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {variations.map((item, idx) => {
          const aspectClass =
            selectedFormat === '4:5'
              ? 'aspect-[4/5] min-h-[480px]'
              : selectedFormat === '1:1'
              ? 'aspect-square min-h-[420px]'
              : 'aspect-[9/16] min-h-[580px]';

          return (
            <div key={item.id} className="flex flex-col gap-3">
              <div
                id={`ad-canvas-${item.id}`}
                className={`relative w-full ${aspectClass} overflow-hidden rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-2xl transition-all border border-white/10`}
                style={{
                  backgroundColor: brand.backgroundColor,
                  color: brand.textColor,
                  fontFamily: brand.fontBody,
                }}
              >
                {/* Glow decorativo */}
                <div
                  className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[90px] opacity-25 pointer-events-none"
                  style={{ backgroundColor: brand.primaryColor }}
                />
                <div
                  className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-[90px] opacity-15 pointer-events-none"
                  style={{ backgroundColor: brand.secondaryColor }}
                />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                      style={{
                        backgroundColor: brand.primaryColor,
                        color: brand.backgroundColor,
                      }}
                    >
                      {brand.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold">{brand.handle}</span>
                  </div>

                  {item.badge && (
                    <span
                      className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border"
                      style={{
                        borderColor: `${brand.primaryColor}66`,
                        backgroundColor: `${brand.primaryColor}15`,
                        color: brand.primaryColor,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Conteúdo Central */}
                <div className="relative z-10 my-auto py-2">
                  <span
                    className="inline-block text-[11px] font-extrabold uppercase px-3 py-1 rounded-md mb-3"
                    style={{
                      backgroundColor: `${brand.primaryColor}20`,
                      color: brand.primaryColor,
                      borderLeft: `3px solid ${brand.primaryColor}`,
                    }}
                  >
                    {item.tag}
                  </span>

                  <h3
                    className="text-2xl sm:text-3xl font-extrabold leading-tight mb-3"
                    style={{
                      fontFamily: brand.fontHeadline,
                      color: brand.textColor,
                    }}
                  >
                    {item.headline}
                  </h3>

                  <p
                    className="text-sm leading-relaxed opacity-85 max-w-md"
                    style={{ color: brand.accentTextColor }}
                  >
                    {item.subheadline}
                  </p>
                </div>

                {/* Footer com CTA de Anúncio */}
                <div className="relative z-10 pt-4 border-t border-white/10">
                  <div
                    className="w-full py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-center shadow-lg transition-all"
                    style={{
                      backgroundColor: brand.primaryColor,
                      color: brand.backgroundColor,
                    }}
                  >
                    {item.cta}
                  </div>
                </div>
              </div>

              {/* Botão de Download Individual */}
              <button
                onClick={() => handleDownloadAd(item.id, idx)}
                disabled={downloadingId === item.id}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs transition-all"
              >
                <Download size={14} />
                {downloadingId === item.id ? 'Baixando PNG...' : `Baixar Variação 0${idx + 1} em Alta Definição`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
