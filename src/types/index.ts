export interface BrandKit {
  id: string;
  name: string;
  handle: string; // ex: @designer.studio
  logoUrl?: string;
  // Identidade
  segment?: string; // ex: 'Moda Feminina', 'Tecnologia B2B'
  slogan?: string; // ex: 'Transformando ideias em resultados'
  website?: string; // ex: 'https://cliente.com.br'
  email?: string; // ex: 'contato@cliente.com.br'
  phone?: string; // ex: '+55 11 99999-9999'
  // Cores principais
  primaryColor: string; // ex: #10b981 (destaque)
  secondaryColor: string; // ex: #f59e0b (apoio)
  backgroundColor: string; // ex: #0a0b10 (fundo escuro)
  cardColor: string; // ex: #161822 (cartoes)
  textColor: string; // ex: #ffffff (texto principal)
  accentTextColor: string; // ex: #94a3b8 (texto secundario)
  // Cores extras
  successColor?: string; // verde para "aprovado"
  warningColor?: string; // amarelo para "alerta"
  errorColor?: string; // vermelho para "erro"
  // Fontes
  fontHeadline: string; // titulos
  fontBody: string; // corpo
  // Tom de comunicacao
  tone?: 'urgente' | 'inspirador' | 'profissional' | 'casual' | 'luxo';
  // Tomada de decisao sobre o criativo
  style?: 'modern' | 'minimalist' | 'bold' | 'elegant' | 'playful';
}

export interface LocalFont {
  family: string;
  base64: string;
  format: string;
  weight?: string;
  italic?: boolean;
}

export type TemplateStyle =
  | 'minimalist-dark'
  | 'neo-brutalist'
  | 'glassmorphism'
  | 'editorial-luxury'
  | 'tech-modern';

export interface CarouselSlide {
  id: string;
  type: 'cover' | 'content' | 'quote' | 'checklist' | 'cta';
  tag?: string;
  title: string;
  highlightText?: string;
  subtitle?: string;
  bodyList?: string[];
  ctaButton?: string;
  imageUrl?: string;
  badge?: string;
  // Campos extras personalizaveis
  topBadge?: string;          // ex: '🔥 Post Novo', '🚀 NOVO', '💡 DICA'
  bottomLeft?: string;        // ex: 'DESLIZE PARA VER →', 'Arraste ➔'
  bottomRight?: string;       // ex: 'Salvar post', 'Marcar ⭐'
  // Posicoes X/Y dos textos (em % do canvas)
  tagPos?: { x: number; y: number };
  titlePos?: { x: number; y: number };
  highlightPos?: { x: number; y: number };
  subtitlePos?: { x: number; y: number };
  ctaPos?: { x: number; y: number };
  bodyListPos?: { x: number; y: number };
  // =========================================
  // Direção artística deste slide (opcional)
  // Quando preenchidos, sobrescrevem o imagePrompt com buildDirectedPrompt()
  // =========================================
  artDirection?: 'minimalista' | 'editorial' | 'dramatico' | 'cinematografico';
  visualCategory?: string;   // id de VISUAL_CATEGORIES (citacao, quiz, personagem, cidade, etc.)
  artBriefing?: string;      // briefing do slide (tema especifico deste slide)
  // Estado local persistido por slide (cache de geracao)
  imagePrompt?: string;      // prompt de imagem custom do usuario
  referenceImage?: string | null; // imagem de referencia base64
  personImage?: string | null; // foto do personagem real (PNG recortado), usada para preservar identidade
}

export interface CarouselProject {
  id: string;
  title: string;
  brandId: string;
  aspectRatio: '4:5' | '1:1' | '9:16'; // 4:5 = 1080x1350 (IG Feed), 1:1 = 1080x1080, 9:16 = Stories/Reels
  templateStyle: TemplateStyle;
  slides: CarouselSlide[];
}

export interface AdVariation {
  id: string;
  headline: string;
  subheadline: string;
  cta: string;
  tag: string;
  badge?: string;
  bgGradient: string;
}

export interface ApiSettings {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  falApiKey?: string;
  provider: 'openai' | 'Opus 4.8';
}

// =========================================
// Tipografia avancada (por texto)
// =========================================
export interface TypographyConfig {
  visible: boolean;
  fontFamily: string;
  fontSize: number;
  fontWeight: '300' | '400' | '500' | '600' | '700' | '800' | '900';
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  color: string;
  useUppercase: boolean;
  useUnderline: boolean;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  highlightEnabled: boolean;
  highlightColor: string;
  highlightPaddingX: number;
  highlightPaddingY: number;
  highlightBorderRadius: number;
}

// =========================================
// Sistema de Projetos Salvos (Meus Projetos)
// =========================================

export type SavedProjectType = 'carousel' | 'single-image' | 'pose' | 'batch-ads';

export interface SavedProject {
  id: string;
  name: string;
  type: SavedProjectType;
  brandId: string;
  brandName: string;
  thumbnail?: string; // data URL da miniatura (primeiro slide ou preview)
  createdAt: string;  // ISO date
  updatedAt: string;  // ISO date
  // Snapshot completo de tudo que foi feito (textos, imagens, cores, etc.)
  data: SavedCarouselData | SavedSingleImageData | SavedPoseData | SavedBatchAdsData;
}

export interface SavedCarouselData {
  project: CarouselProject;
}

export interface SavedSingleImageData {
  format: '4:5' | '1:1' | '9:16' | '16:9';
  bgPrompt: string;
  bgImage: string | null;
  referenceImage: string | null;
  logoImage: string | null;
  logoPosition:
    | 'top-left' | 'top-center' | 'top-right'
    | 'middle-left' | 'middle-center' | 'middle-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';
  logoScale: number;
  // Degradê customizado do background
  gradientColor1: string;
  gradientColor2: string;
  gradientAngle: number;
  gradientOpacity: number;
  useGradient: boolean;
  // Glows da marca
  showBrandGlows: boolean;
  glowIntensity: number;
  // Configuracoes tipograficas avancadas
  tagConfig: TypographyConfig;
  headlineConfig: TypographyConfig;
  highlightConfig: TypographyConfig;
  sublineConfig: TypographyConfig;
  ctaConfig: TypographyConfig;
  personImage: string | null;
  personPosition: 'right' | 'left' | 'center';
  personScale: number;
  personFlipped: boolean;
  personShadow: boolean;
  personGlow: boolean;
  personBottomFade: boolean;
  showText: boolean;
  showTopBar: boolean;
  showTag: boolean;
  showHandle: boolean;
  showBadge: boolean;
  customTopText: string;
  tag: string;
  headline: string;
  highlightText: string;
  subline: string;
  ctaText: string;
  showCta: boolean;
  headlineFont: string;
  textAlignment: 'left' | 'center';
  selectedBadge: string | null;
  generatedGallery: string[];
  editMode?: 'auto' | 'free';
  freeLayers?: Array<Record<string, unknown>>;
  selectedModel?: string;
  // =========================================
  // Direção artística (paridade com carrossel)
  // =========================================
  artDirection?: 'minimalista' | 'editorial' | 'dramatico' | 'cinematografico';
  visualCategory?: string;
  artBriefing?: string;
}

export interface SavedPoseData {
  selectedPose: string;
  selectedAttire: string;
  selectedBg: string;
  customDetails: string;
  generatedPoses: string[];
  faceImage?: string | null;
}

export interface SavedBatchAdsData {
  productTopic: string;
  targetPain: string;
  selectedFormat: '4:5' | '1:1' | '9:16';
  variations: Array<{
    id: string;
    headline: string;
    subheadline: string;
    cta: string;
    tag: string;
    bgGradient: string;
    imageUrl?: string;
  }>;
}

// =========================================
// Autenticação e Sessão de Usuário
// =========================================
export interface AuthUser {
  name: string;
  email: string;
  /** Legado: removido automaticamente depois do primeiro login bem-sucedido. */
  pin?: string;
  pinHash?: string;
  pinSalt?: string;
  role?: string;
  createdAt: string;
}

export interface AuthSession {
  isLoggedIn: boolean;
  user: {
    name: string;
    email: string;
  } | null;
  loggedInAt?: string;
}
