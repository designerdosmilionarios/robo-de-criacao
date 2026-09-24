import React, { useState } from 'react';
import { Sparkles, Wand2, Layers, Download, Check } from 'lucide-react';
import { CarouselSlide } from '@/types';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySlides: (title: string, slides: CarouselSlide[]) => void;
  brandName: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplySlides,
  brandName,
}) => {
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('Empreendedores e Clientes Potenciais');
  const [goal, setGoal] = useState<'leads' | 'autoridade' | 'vendas'>('leads');
  const [slideCount, setSlideCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);

    // Motor de inteligência de roteiro para designers/agências
    setTimeout(() => {
      const generatedTitle = topic || 'Estratégia de Alta Conversão';

      const generatedSlides: CarouselSlide[] = [
        {
          id: `slide-${Date.now()}-1`,
          type: 'cover',
          tag: 'GUIA PRÁTICO DEFINITIVO',
          title: topic ? `Como dominar ${topic}` : 'Como transformar visual em faturamento real',
          highlightText: 'sem depender da sorte ou de anúncios caros.',
          subtitle: `Um roteiro passo a passo validado para ${targetAudience} alcançarem resultados imediatos.`,
          badge: 'ARRASTE PARA O LADO ➔',
        },
        {
          id: `slide-${Date.now()}-2`,
          type: 'content',
          tag: '1. O ERRO MAIS COMUM',
          title: 'A maioria tenta vender o produto antes de vender o valor.',
          highlightText: 'O cliente não compra a ferramenta, compra a transformação.',
          subtitle: 'Quando a sua comunicação foca apenas em especificações técnicas, você vira commodity.',
          bodyList: [
            'Foque 80% do anúncio no alívio da dor do cliente.',
            'Use dados e provas visuais concretas.',
            'Elimine o atrito: clareza sempre supera a estética vazia.'
          ],
        },
        {
          id: `slide-${Date.now()}-3`,
          type: 'checklist',
          tag: '2. OS 3 PILARES DO SUCESSO',
          title: 'O checklist inegociável para se destacar no mercado:',
          highlightText: 'Aplique hoje mesmo:',
          bodyList: [
            'Posicionamento visual inconfundível (reconhecimento em 1 segundo).',
            'Oferta irresistível com garantia e incentivo à ação.',
            'Consistência diária de testes e otimização contínua de criativos.'
          ],
        },
        {
          id: `slide-${Date.now()}-4`,
          type: 'quote',
          tag: 'INSIGHT DO ESPECIALISTA',
          title: '"Quem tem um processo bem definido nunca fica refém da falta de ideias ou da correria."',
          highlightText: 'Automatize a execução para focar na estratégia.',
          subtitle: 'A inteligência artificial não cria visão de negócios, ela apenas acelera a mão de obra de quem já sabe o que está fazendo.',
        },
        {
          id: `slide-${Date.now()}-5`,
          type: 'cta',
          tag: 'AÇÃO IMEDIATA',
          title: goal === 'leads'
            ? 'Quer acelerar esse processo no seu negócio ainda essa semana?'
            : 'Gostou desse conteúdo e quer aplicar no seu dia a dia?',
          highlightText: 'Envie uma mensagem no direct.',
          subtitle: 'Comente "EU QUERO" ou envie uma DM com a sua dúvida para recebermos seu diagnóstico gratuito.',
          ctaButton: 'CHAMAR NO DIRECT AGORA',
          badge: 'SALVE PARA NÃO ESQUECER',
        },
      ];

      onApplySlides(generatedTitle, generatedSlides);
      setIsGenerating(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0d0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Wand2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Criador Automático de Carrossel (IA)</h2>
              <p className="text-sm text-gray-400">
                Gere roteiro, hierarquia visual e slides prontos para a marca <span className="text-brand-400 font-semibold">{brandName}</span>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
              Tema ou Assunto do Carrossel
            </label>
            <input
              type="text"
              placeholder="Ex: Como comprar imóvel sem juros abusivos / 5 segredos de tráfego pago..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                Público-Alvo
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ex: Médicos, Jovens casais, Empreendedores..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                Objetivo do Post
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="leads" className="bg-[#11131a]">Geração de Leads (DM / WhatsApp)</option>
                <option value="autoridade" className="bg-[#11131a]">Autoridade e Compartilhamento</option>
                <option value="vendas" className="bg-[#11131a]">Venda Direta / Oferta</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers size={18} className="text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-white">Número de Slides no Carrossel</p>
                <p className="text-xs text-gray-400">Padrão recomendado para retenção no feed: 5 slides</p>
              </div>
            </div>
            <span className="text-sm font-bold font-mono px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white">
              5 Slides
            </span>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-500 to-emerald-400 text-dark-900 hover:opacity-95 transition-all shadow-xl disabled:opacity-50"
            >
              <Sparkles size={16} />
              {isGenerating ? 'Criando Roteiro e Slides...' : 'Gerar Carrossel Completo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
