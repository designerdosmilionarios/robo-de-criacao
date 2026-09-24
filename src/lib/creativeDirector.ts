// =============================
// BIBLIOTECA DE INTELIGÊNCIA CRIATIVA
// Inspirado em analise de sites de design (designi.com.br, gravyx.com.br, behance.net)
// =============================

export interface PromptCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
  prompts: PromptTemplate[];
  copySnippets: CopySnippet[];
  palettes: string[];
  brandStyles: string[];
}

export interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  tags: string[];
  bestFor: string; // 'feed' | 'story' | 'thumb' | 'capa' | 'comercial'
  quality: 'rapido' | 'equilibrado' | 'premium';
}

export interface CopySnippet {
  id: string;
  title: string;
  type: 'hook' | 'headline' | 'cta' | 'subline';
  text: string;
  category: string;
}

// Bancos de prompts profissionais organizados por nicho
export const CREATIVE_CATEGORIES: PromptCategory[] = [
  {
    id: 'ecommerce',
    label: 'E-commerce / Produto',
    emoji: '🛍️',
    description: 'Anuncios focados em mostrar produto com desejo de compra',
    prompts: [
      {
        id: 'ec-1',
        title: 'Hero Shot Cinematografico',
        prompt: 'Cinematic commercial product photography, single product floating in air with soft floating dust particles, dramatic rim lighting with green and gold accent lights, premium black background, hyper-detailed, 8k, advertising agency quality, negative space on the right for text',
        tags: ['produto', 'premium', 'hero'],
        bestFor: 'feed',
        quality: 'premium',
      },
      {
        id: 'ec-2',
        title: 'Unboxing Dark Luxo',
        prompt: 'Premium unboxing scene, minimalist dark stage with soft spot light from above, single luxury product emerging from premium packaging, gold rim lighting, shiny black floor with subtle reflections, editorial magazine quality',
        tags: ['luxo', 'unboxing', 'premium'],
        bestFor: 'feed',
        quality: 'premium',
      },
      {
        id: 'ec-3',
        title: 'Flat Lay Clean',
        prompt: 'Clean flat lay product photography on neutral linen textured background, soft natural daylight, top-down view, multiple complementary products arranged aesthetically, bright and airy, lifestyle brand aesthetic',
        tags: ['flat-lay', 'limpo', 'lifestyle'],
        bestFor: 'feed',
        quality: 'equilibrado',
      },
    ],
    copySnippets: [
      { id: 'ec-h1', title: 'Hook Escassez', type: 'hook', text: 'VOCE NAO VAI ENCONTRAR ISSO AMANHA', category: 'ecommerce' },
      { id: 'ec-h2', title: 'Hook Prova Social', type: 'hook', text: '10.000 PESSOAS JA COMPRARAM ISSO', category: 'ecommerce' },
      { id: 'ec-h3', title: 'Hook Curiosidade', type: 'hook', text: 'O SEGREDO QUE NINGUEM CONTA SOBRE...', category: 'ecommerce' },
      { id: 'ec-h4', title: 'Headline Dor+Solucao', type: 'headline', text: 'Cansado de [dor]? A solucao finalmente chegou', category: 'ecommerce' },
      { id: 'ec-h5', title: 'Headline Beneficio Direto', type: 'headline', text: 'Transforme seu [desejo] em realidade', category: 'ecommerce' },
      { id: 'ec-cta1', title: 'CTA Urgencia', type: 'cta', text: 'COMPRAR AGORA ANTES QUE ACABE', category: 'ecommerce' },
      { id: 'ec-cta2', title: 'CTA Garantia', type: 'cta', text: 'QUERO COM GARANTIA DE 30 DIAS', category: 'ecommerce' },
    ],
    palettes: ['#0a0b10 / #00F59B', '#1a1a2e / #f59e0b', '#f5f5f0 / #2c2c2c'],
    brandStyles: ['Modern Premium', 'Tech Minimalist', 'Lifestyle Aspirational'],
  },
  {
    id: 'socialmedia',
    label: 'Social Media / Posts',
    emoji: '📱',
    description: 'Posts de Instagram, TikTok, LinkedIn e outras redes',
    prompts: [
      {
        id: 'sm-1',
        title: 'Carrossel Educativo',
        prompt: 'Modern educational post design, soft pastel gradient background, single floating 3D icon representing the topic, clean minimalist typography space, Gen-Z aesthetic, soft shadows, 8k',
        tags: ['educativo', 'carrossel', 'minimalista'],
        bestFor: 'feed',
        quality: 'rapido',
      },
      {
        id: 'sm-2',
        title: 'Quote Motivacional',
        prompt: 'Cinematic motivational background, dramatic rays of light breaking through clouds, vast landscape with golden hour lighting, space for large white quote text in center, epiphany mood, 8k photographic',
        tags: ['motivacional', 'quote', 'epico'],
        bestFor: 'feed',
        quality: 'premium',
      },
      {
        id: 'sm-3',
        title: 'Behind the Scenes',
        prompt: 'Authentic behind the scenes workspace, warm afternoon sunlight streaming through window, organized desk with creative tools visible, shallow depth of field, golden hour warm tones, candid lifestyle photography',
        tags: ['bts', 'autentico', 'lifestyle'],
        bestFor: 'story',
        quality: 'equilibrado',
      },
      {
        id: 'sm-4',
        title: 'Reels Cover Chamativo',
        prompt: 'Vibrant eye-catching reels cover, bold typography-friendly background, neon glows in pink and cyan, urban streetwear aesthetic, high contrast, single focal point, vertical 9:16 composition',
        tags: ['reels', 'vertical', 'chamativo'],
        bestFor: 'story',
        quality: 'equilibrado',
      },
    ],
    copySnippets: [
      { id: 'sm-h1', title: 'Hook Padrao de Bolha', type: 'hook', text: 'POV: voce descobre [beneficio]', category: 'socialmedia' },
      { id: 'sm-h2', title: 'Hook Erro Comum', type: 'hook', text: 'NUNCA faca isso se voce quer [objetivo]', category: 'socialmedia' },
      { id: 'sm-h3', title: 'Headline Numerica', type: 'headline', text: '7 dias. 1 habito. Resultados reais.', category: 'socialmedia' },
      { id: 'sm-h4', title: 'Headline Historia', type: 'headline', text: 'Como eu passei de X para Y em Z tempo', category: 'socialmedia' },
      { id: 'sm-cta1', title: 'CTA Salvar', type: 'cta', text: 'SALVE ESSE POST pro futuro', category: 'socialmedia' },
      { id: 'sm-cta2', title: 'CTA Compartilhar', type: 'cta', text: 'MARQUE alguem que precisa ver isso', category: 'socialmedia' },
    ],
    palettes: ['#ffe5ec / #ff70a6', '#f5f5f5 / #111111', '#8338ec / #ff006e'],
    brandStyles: ['Gen-Z Vibrant', 'Clean Minimalist', 'Dark Mode Premium'],
  },
  {
    id: 'infoproduto',
    label: 'Infoproduto / Mentoria',
    emoji: '🎓',
    description: 'Cursos online, mentorias, ebooks e produtos digitais',
    prompts: [
      {
        id: 'ip-1',
        title: 'Autoridade Premium',
        prompt: 'Premium professional office setting, executive business person confidently gesturing presenting, modern minimalist corporate office background, soft natural light, cinematic depth, leadership mood, 8k',
        tags: ['autoridade', 'mentor', 'escritorio'],
        bestFor: 'feed',
        quality: 'premium',
      },
      {
        id: 'ip-2',
        title: 'Transformacao Hero',
        prompt: 'Dramatic before/after split concept: dark side transitioning to golden light side, metaphorical journey of transformation, single human silhouette in center, cinematic color grading, inspirational mood',
        tags: ['transformacao', 'journey', 'metafora'],
        bestFor: 'feed',
        quality: 'premium',
      },
      {
        id: 'ip-3',
        title: 'Infografico Clean',
        prompt: 'Clean infographic-ready background, subtle gradient from light gray to white, geometric minimalist shapes in corner, modern corporate aesthetic, clean negative space for text overlay',
        tags: ['infografico', 'clean', 'corporativo'],
        bestFor: 'feed',
        quality: 'rapido',
      },
    ],
    copySnippets: [
      { id: 'ip-h1', title: 'Hook Antes/Depois', type: 'hook', text: 'De R$ 0 a R$ 100k em 90 dias. Veja como.', category: 'infoproduto' },
      { id: 'ip-h2', title: 'Hook Polemica', type: 'hook', text: '90% das pessoas erram neste passo', category: 'infoproduto' },
      { id: 'ip-h3', title: 'Headline Metodo', type: 'headline', text: 'O Metodo [X] em [Y] passos', category: 'infoproduto' },
      { id: 'ip-h4', title: 'Headline Prova', type: 'headline', text: 'Mais de X alunos transformados', category: 'infoproduto' },
      { id: 'ip-cta1', title: 'CTA Inscricao', type: 'cta', text: 'QUERO PARTICIPAR DA TURMA', category: 'infoproduto' },
      { id: 'ip-cta2', title: 'CTA Lead', type: 'cta', text: 'QUERO SABER MAIS NO WHATSAPP', category: 'infoproduto' },
    ],
    palettes: ['#0a0b10 / #FFD700', '#1a1a2e / #00FF88', '#fffaf0 / #8B4513'],
    brandStyles: ['Executive Premium', 'Method Guru', 'Behind The Scenes'],
  },
  {
    id: 'local',
    label: 'Negocios Locais',
    emoji: '🏪',
    description: 'Restaurantes, saloes, clinicas, academias e negocios de bairro',
    prompts: [
      {
        id: 'loc-1',
        title: 'Ambiente Acolhedor',
        prompt: 'Warm inviting interior of a local business, soft ambient lighting, real people in authentic candid moments, warm color palette, lifestyle photography, golden hour through windows',
        tags: ['local', 'acolhedor', 'real'],
        bestFor: 'feed',
        quality: 'equilibrado',
      },
      {
        id: 'loc-2',
        title: 'Antes/Depois Resultado',
        prompt: 'Split composition showing before and after transformation result, clean modern aesthetic in the after side, dramatic improvement highlight, professional photography',
        tags: ['antes-depois', 'resultado', 'transformacao'],
        bestFor: 'feed',
        quality: 'rapido',
      },
    ],
    copySnippets: [
      { id: 'loc-h1', title: 'Hook Bairro', type: 'hook', text: 'O melhor [servico] do bairro', category: 'local' },
      { id: 'loc-h2', title: 'Hook Promocao', type: 'hook', text: 'Essa semana: [desconto]% off', category: 'local' },
      { id: 'loc-h3', title: 'Headline Local', type: 'headline', text: 'Voce merece ser bem atendido', category: 'local' },
      { id: 'loc-cta1', title: 'CTA Direto', type: 'cta', text: 'AGENDE AGORA PELO WHATSAPP', category: 'local' },
      { id: 'loc-cta2', title: 'CTA Visita', type: 'cta', text: 'VENHA CONHECER NOSSO ESPACO', category: 'local' },
    ],
    palettes: ['#fdf6e3 / #cb4b16', '#fafafa / #2196f3', '#2d3436 / #fab1a0'],
    brandStyles: ['Warm Local', 'Professional Service', 'Modern Boutique'],
  },
  {
    id: 'youtube',
    label: 'YouTube Thumb',
    emoji: '🎬',
    description: 'Thumbnails de alta conversao para YouTube',
    prompts: [
      {
        id: 'yt-1',
        title: 'Background Epico',
        prompt: 'Epic cinematic action scene background, dramatic explosion or storm in distance, single silhouetted subject in foreground, intense rim lighting, super saturated colors, ultra high contrast for thumbnail',
        tags: ['thumb', 'epico', 'acao'],
        bestFor: 'thumb',
        quality: 'premium',
      },
      {
        id: 'yt-2',
        title: 'Reacao Emocional',
        prompt: 'Dramatic emotional portrait background, intense colored lighting (red/blue split), human silhouette with shocked expression implied, cinematic depth, ultra contrast 16:9',
        tags: ['thumb', 'emocao', 'reacao'],
        bestFor: 'thumb',
        quality: 'premium',
      },
      {
        id: 'yt-3',
        title: 'Minimalista Expressivo',
        prompt: 'Minimal bold single subject background, dramatic single color saturated background (yellow/cyan/red), ultra high contrast, ready for big bold text overlay, attention grabbing composition',
        tags: ['thumb', 'minimalista', 'bold'],
        bestFor: 'thumb',
        quality: 'rapido',
      },
    ],
    copySnippets: [
      { id: 'yt-h1', title: 'Hook Curiosidade Extrema', type: 'hook', text: 'EU NAO ACREDITAVA NISSO...', category: 'youtube' },
      { id: 'yt-h2', title: 'Hook Numero Polemico', type: 'hook', text: '7 ERROS que esta destruindo seu [X]', category: 'youtube' },
      { id: 'yt-h3', title: 'Headline Desafio', type: 'headline', text: 'EU TENTEI por 30 dias e olha o que aconteceu', category: 'youtube' },
      { id: 'yt-cta1', title: 'CTA Inscricao', type: 'cta', text: 'INSCREVA-SE AGORA', category: 'youtube' },
    ],
    palettes: ['#FF0000 / #FFD700', '#0066FF / #00FF00', '#000000 / #FFFF00'],
    brandStyles: ['High CTR Bold', 'Cinematic Drama', 'YouTuber Vlog'],
  },
];

// Prompts de estilo global (para ajuste fino extra)
export const STYLE_MODIFIERS: Record<string, string> = {
  premium: 'premium commercial quality, 8k, hyper-detailed, magazine aesthetic',
  cinematic: 'cinematic lighting, dramatic composition, film grain, anamorphic look',
  minimalist: 'minimalist, lots of negative space, clean lines, understated',
  retro: 'retro 80s aesthetic, grainy film, neon colors, vintage',
  corporate: 'corporate professional, clean lines, trustworthy mood',
  playful: 'playful, vibrant colors, fun elements, Gen-Z aesthetic',
};

// Construtor de prompt enriquecido
export function buildCreativePrompt(categoryId: string, promptId: string, customStyle?: string): string {
  const category = CREATIVE_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return '';

  const prompt = category.prompts.find((p) => p.id === promptId);
  if (!prompt) return '';

  const styleSuffix = customStyle && STYLE_MODIFIERS[customStyle] ? `, ${STYLE_MODIFIERS[customStyle]}` : '';
  return `${prompt.prompt}${styleSuffix}`;
}

// Helpers para tipografia
export const HEADLINE_PATTERNS = [
  'Numero + Beneficio: "X coisas que Y"',
  'Pergunta Aberta: "Por que X?"',
  'Como + Resultado: "Como X em Y tempo"',
  'Metodo + Numero: "O Metodo X em Y passos"',
  'Historia Pessoal: "Como eu Y"',
  'Antes/Depois: "De X para Y"',
  'Prova Social: "X pessoas ja Y"',
  'Erro Comum: "Nunca faca X"',
  'Tempo + Resultado: "Em X dias, Y"',
  'Secreto + Curiosidade: "O segredo de X"',
];

export const HOOK_FORMULAS = [
  'POV: [situacao]',
  'STOP! [chamada de atencao]',
  'Voce sabia que [curiosidade]?',
  'A verdade sobre [topico]',
  'Por que [situacao comum]?',
  'Aqui esta o que ninguem te conta sobre [topico]',
  'Se voce [dor], [promessa]',
  'Eu tentei [acao] por [tempo] e olha o que aconteceu',
];
