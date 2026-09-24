import { BrandKit, CarouselProject } from '@/types';

export const DEFAULT_BRANDS: BrandKit[] = [
  {
    id: 'brand-1',
    name: 'Studio Design & Performance',
    handle: '@studio.design',
    primaryColor: '#00F59B', // Verde neon alta conversão
    secondaryColor: '#3B82F6', // Azul elétrico
    backgroundColor: '#07090E', // Preto profundo
    cardColor: '#12151F',
    textColor: '#FFFFFF',
    accentTextColor: '#94A3B8',
    fontHeadline: 'Plus Jakarta Sans',
    fontBody: 'Inter',
  },
  {
    id: 'brand-2',
    name: 'Ane Consórcios',
    handle: '@aneconsorcios',
    primaryColor: '#F59E0B', // Dourado / Âmbar
    secondaryColor: '#10B981',
    backgroundColor: '#0F172A',
    cardColor: '#1E293B',
    textColor: '#F8FAFC',
    accentTextColor: '#CBD5E1',
    fontHeadline: 'Montserrat',
    fontBody: 'Inter',
  },
  {
    id: 'brand-3',
    name: 'Fintech & Tech B2B',
    handle: '@fintech.grow',
    primaryColor: '#6366F1', // Roxo / Indigo
    secondaryColor: '#EC4899', // Rosa neon
    backgroundColor: '#0A0A0C',
    cardColor: '#141419',
    textColor: '#FFFFFF',
    accentTextColor: '#A1A1AA',
    fontHeadline: 'Syne',
    fontBody: 'Inter',
  }
];

export const INITIAL_CAROUSEL: CarouselProject = {
  id: 'carousel-demo',
  title: 'Como Escalar Criativos Sem Perder Qualidade',
  brandId: 'brand-1',
  aspectRatio: '4:5',
  templateStyle: 'tech-modern',
  slides: [
    {
      id: 'slide-1',
      type: 'cover',
      tag: 'DESIGN & IA NO META ADS',
      title: 'Como produzir 30 criativos de alta conversão por semana',
      highlightText: 'sem burnout e sem perder o padrão de agência.',
      subtitle: 'O método prático que os maiores estúdios de design estão usando para multiplicar entregas.',
      badge: 'DESLIZE PARA VER O PASSO A PASSO ➔',
    },
    {
      id: 'slide-2',
      type: 'content',
      tag: 'O GRANDE GARGALO',
      title: 'O design manual não acompanha o ritmo do algoritmo.',
      highlightText: 'Fadiga criativa mata o ROAS.',
      subtitle: 'Se o seu cliente roda R$ 5k+ por mês em anúncios, o anúncio satura em 7 dias. Você precisa de volume rápido e de testes de ângulos diferentes.',
      bodyList: [
        'A criação do zero em cada peça consome 80% do seu tempo.',
        'Variações de copy e imagem devem ser automatizadas.',
        'O seu foco deve ser na direção de arte, e não em tarefas repetitivas.'
      ]
    },
    {
      id: 'slide-3',
      type: 'checklist',
      tag: 'A NOVA ESTRATÉGIA',
      title: 'A anatomia de um criativo com taxa de clique (CTR) acima de 2.5%',
      highlightText: 'Elementos inegociáveis:',
      bodyList: [
        'Contraste agressivo nos primeiros 3 segundos de visualização.',
        'Headline com benefício imediato ou quebra de objeção.',
        'Hierarquia tipográfica clara: ninguém lê blocos densos no celular.',
        'Cores e elementos de marca padronizados (Brand Equity).'
      ]
    },
    {
      id: 'slide-4',
      type: 'quote',
      tag: 'INSIGHT DO DIRETOR',
      title: '\"IA não substitui o designer de alto nível. Mas o designer que usa automações substitui 10 que ainda fazem tudo na mão.\"',
      highlightText: 'Domine a esteira de produção.',
      subtitle: 'Você passa a cobrar pelo resultado e velocidade, não pelas horas sentado no Photoshop.'
    },
    {
      id: 'slide-5',
      type: 'cta',
      tag: 'PRÓXIMO PASSO',
      title: 'Quer que eu crie a estratégia visual do seu negócio?',
      highlightText: 'Envie uma mensagem direta.',
      subtitle: 'Tenho apenas 2 vagas para consultoria e esteira criativa neste mês.',
      ctaButton: 'ENVIAR DM NO INSTAGRAM',
      badge: 'SALVE ESTE POST PARA CONSULTAR DEPOIS'
    }
  ]
};
