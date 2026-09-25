import React, { useState, useRef, useEffect } from 'react';
import { BrandKit, LocalFont } from '@/types';
import {
  ImageIcon,
  Upload,
  Sparkles,
  Loader2,
  Wand2,
  X,
  Download,
  User,
  Sliders,
  Maximize2,
  FlipHorizontal,
  Layers,
  ChevronDown,
  MousePointerClick,
  MousePointer,
  RotateCcw,
  Palette,
  CheckCircle2,
  Shield,
  Award,
  Star,
  Eye,
  Trash2,
  Image as ImgIcon,
  Save,
  RefreshCw,
  Type,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import saveAs from 'file-saver';
import { optimizeImageDataUrl } from '@/lib/imageData';
import { CreativeDirectorPanel } from '@/components/CreativeDirectorPanel';
import { buildDirectedPrompt } from '@/lib/creativeDirector';
import {
  TypographyControl,
  DEFAULT_TYPOGRAPHY,
  TypographyConfig,
  buildTextStyle,
  buildContainerStyle,
} from '@/components/TypographyControl';
import { FreeCanvasEditor, CanvasLayer } from '@/components/FreeCanvasEditor';
import { SmartTemplates, SmartTemplate, AVAILABLE_TEMPLATES } from '@/components/SmartTemplates';
import { usePersistedState } from '@/lib/usePersistedState';
import { BackgroundImageControl, buildBackgroundImageStyle } from '@/components/BackgroundImageControl';
import {
  dataUrlToCanvas,
  exportEditablePsd,
  exportExactPsd,
  PsdNativeTextLayer,
} from '@/lib/psdExport';
import { TextGradientOverlay, buildOverlayStyle, DEFAULT_OVERLAY, GradientOverlayConfig } from '@/components/TextGradientOverlay';

const SUPPORTED_IMAGE_MODELS = ['auto', 'gpt-image-2.5-sunburst', 'gpt-image-2.5-flare', 'gpt-image-2'];

interface SingleImageCreatorProps {
  brand: BrandKit;
  apiKey: string;
  provider?: 'openai';
  localFonts: LocalFont[];
  externalPersonImage?: string | null;
  onClearExternalPerson?: () => void;
  onRegisterControls?: (controls: {
    state: any;
    load: (data: any) => void;
  }) => void;
  onSaveRequest?: () => void;
}

export const SingleImageCreator: React.FC<SingleImageCreatorProps> = ({
  brand,
  apiKey,
  localFonts,
  externalPersonImage,
  onClearExternalPerson,
  onRegisterControls,
  onSaveRequest,
}) => {
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const personFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Formato do Canvas (PERSISTIDO)
  const [format, setFormat] = usePersistedState<'4:5' | '1:1' | '9:16' | '16:9'>('single_format', '4:5');

  // Background (PERSISTIDO)
  const [bgPrompt, setBgPrompt] = usePersistedState<string>('single_bg_prompt', '');
  const [bgImage, setBgImage] = usePersistedState<string | null>('single_bg_image', null);
  // Controle de zoom e posicao do background
  const [bgScale, setBgScale] = usePersistedState<number>('single_bg_scale', 100);
  const [bgOffsetX, setBgOffsetX] = usePersistedState<number>('single_bg_x', 0);
  const [bgOffsetY, setBgOffsetY] = usePersistedState<number>('single_bg_y', 0);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  // Modelo de IA escolhido pelo usuário (auto = tenta do melhor pro pior)
  const [selectedModel, setSelectedModel] = usePersistedState<string>('single_model', 'auto');

  // =========================================
  // Direção artística (paridade com carrossel)
  // =========================================
  const [artDirection, setArtDirection] = usePersistedState<'minimalista' | 'editorial' | 'dramatico' | 'cinematografico'>(
    'single_art_direction',
    'editorial'
  );
  const [visualCategory, setVisualCategory] = usePersistedState<string>('single_visual_category', 'citacao');
  const [artBriefing, setArtBriefing] = usePersistedState<string>('single_art_briefing', '');

  useEffect(() => {
    if (!SUPPORTED_IMAGE_MODELS.includes(selectedModel)) setSelectedModel('auto');
  }, [selectedModel, setSelectedModel]);

  // Compõe o prompt com base na direção artística (ou cai pro bgPrompt cru)
  const composePromptForGeneration = (): string => {
    const hasDirection = !!(artDirection || visualCategory || artBriefing);
    const supportsPerson = artDirection === 'dramatico' || artDirection === 'cinematografico';
    if (!hasDirection) {
      return bgPrompt || 'premium dark cinematic background for advertising';
    }
    const composed = buildDirectedPrompt({
      briefing: artBriefing || headline || 'Criativo único',
      direction: artDirection,
      visualCategory,
      style: 'premium',
      personPhoto: supportsPerson && !!personImage,
    });
    return composed.prompt;
  };

  // Foto do personagem tem prioridade sobre referenceImage para preservar identidade
  const getIdentityImage = (): string | null => personImage || referenceImage;

  // Degradê customizado (PERSISTIDO)
  const [useGradient, setUseGradient] = usePersistedState<boolean>('single_use_gradient', true);
  const [gradientColor1, setGradientColor1] = usePersistedState<string>('single_grad_c1', '#0a1f1a');
  const [gradientColor2, setGradientColor2] = usePersistedState<string>('single_grad_c2', '#0a0b10');
  const [gradientAngle, setGradientAngle] = usePersistedState<number>('single_grad_angle', 135);
  const [gradientOpacity, setGradientOpacity] = usePersistedState<number>('single_grad_opacity', 100);

  // Glows de marca (esferas coloridas desfocadas no fundo)
  const [showBrandGlows, setShowBrandGlows] = usePersistedState<boolean>('single_show_glows', true);
  const [glowIntensity, setGlowIntensity] = usePersistedState<number>('single_glow_intensity', 35);

  // Overlay de degradê para contraste de leitura
  const [textOverlay, setTextOverlay] = usePersistedState<GradientOverlayConfig>(
    'single_text_overlay',
    DEFAULT_OVERLAY
  );

  // SELECAO E DRAG DIRETO NO CANVAS (mais controle sem ir no painel direito)
  const [selectedCanvasEl, setSelectedCanvasEl] = usePersistedState<'logo' | 'text' | 'person' | null>('single_selected_el', null);
  const [logoXY, setLogoXY] = usePersistedState<{ x: number; y: number } | null>('single_logo_xy', null);
  const [personXY, setPersonXY] = usePersistedState<{ x: number; y: number } | null>('single_person_xy', null);
  const [textBlockXY, setTextBlockXY] = useState<{ x: number; y: number }>({ x: 50, y: 80 });

  // Posicao X/Y individual para cada texto (em %)
  const [tagPos, setTagPos] = usePersistedState<{ x: number; y: number } | null>('single_tag_pos', null);
  const [headlinePos, setHeadlinePos] = usePersistedState<{ x: number; y: number } | null>('single_headline_pos', null);
  const [highlightPos, setHighlightPos] = usePersistedState<{ x: number; y: number } | null>('single_highlight_pos', null);
  const [sublinePos, setSublinePos] = usePersistedState<{ x: number; y: number } | null>('single_subline_pos', null);
  const [ctaPos, setCtaPos] = usePersistedState<{ x: number; y: number } | null>('single_cta_pos', null);

  // MODO VARIAÇÕES EM MASSA
  const [variationsCount, setVariationsCount] = usePersistedState<number>('single_variations_count', 4);
  const [bulkVariations, setBulkVariations] = useState<string[]>([]);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  // MODO REFINAMENTO ITERATIVO
  const [refinementInstruction, setRefinementInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refinementHistory, setRefinementHistory] = useState<Array<{ instruction: string; result: string }>>([]);

  // MESTRE DOS PROMPTS (Genos-style)
  const [masterPromptInput, setMasterPromptInput] = useState('');
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [masterPromptLog, setMasterPromptLog] = useState<string[]>([]);

  // Imagem de Referência para a IA guiar o estilo
  const [referenceImage, setReferenceImage] = usePersistedState<string | null>('single_ref_image', null);

  // Logo da Marca (PERSISTIDO)
  const [logoImage, setLogoImage] = usePersistedState<string | null>('single_logo_image', brand.logoUrl || null);
  const [logoPosition, setLogoPosition] = usePersistedState<
    'top-left' | 'top-center' | 'top-right' |
    'middle-left' | 'middle-center' | 'middle-right' |
    'bottom-left' | 'bottom-center' | 'bottom-right'
  >('single_logo_pos', 'top-left');
  const [logoScale, setLogoScale] = usePersistedState<number>('single_logo_scale', 100);

  // Imagem de Pessoa Real (PERSISTIDO)
  const [personImage, setPersonImage] = usePersistedState<string | null>('single_person_image', null);
  const [personPosition, setPersonPosition] = usePersistedState<'right' | 'left' | 'center'>('single_person_pos', 'right');
  const [personScale, setPersonScale] = usePersistedState<number>('single_person_scale', 100);
  const [personBottomOffset, setPersonBottomOffset] = usePersistedState<number>('single_person_offset', 0);
  const [personFlipped, setPersonFlipped] = usePersistedState<boolean>('single_person_flipped', false);
  const [personShadow, setPersonShadow] = useState(true);
  const [personGlow, setPersonGlow] = useState(false);
  const [personBottomFade, setPersonBottomFade] = useState(true);

  // Selo de Autoridade / Badge
  const [selectedBadge, setSelectedBadge] = usePersistedState<string | null>('single_selected_badge', 'none');

  // Controles de visibilidade do topo (cada cliente decide)
  const [showTopBar, setShowTopBar] = usePersistedState<boolean>('single_show_topbar', true);
  const [showTag, setShowTag] = usePersistedState<boolean>('single_show_tag', true);
  const [showHandle, setShowHandle] = usePersistedState<boolean>('single_show_handle', true);
  const [showBadge, setShowBadge] = usePersistedState<boolean>('single_show_badge', true);
  const [customTopText, setCustomTopText] = useState('');

  // Configuração da marca - usar handle real ou nome padrão
  useEffect(() => {
    if (brand.handle && !showHandle) setCustomTopText('');
  }, [brand.handle, showHandle]);

  // Camadas de Texto (PERSISTIDAS)
  const [showText, setShowText] = usePersistedState<boolean>('single_show_text', true);
  const [tag, setTag] = usePersistedState<string>('single_tag', 'MÉTODO EXCLUSIVO');
  const [headline, setHeadline] = usePersistedState<string>('single_headline', 'COMO DOBRAR SUAS CONVERSÕES NO META ADS');
  const [highlightText, setHighlightText] = usePersistedState<string>('single_highlight', 'Sem gastar mais em tráfego');
  const [subline, setSubline] = usePersistedState<string>('single_subline', 'Aprenda o passo a passo validado por especialistas.');
  const [ctaText, setCtaText] = usePersistedState<string>('single_cta_text', 'QUERO APRENDER AGORA');
  const [showCta, setShowCta] = usePersistedState<boolean>('single_show_cta', true);
  const [headlineFont, setHeadlineFont] = usePersistedState<string>('single_headline_font', brand.fontHeadline);
  const [textAlignment, setTextAlignment] = usePersistedState<'left' | 'center'>('single_text_align', 'left');

  // CONFIGURACOES TIPOGRAFICAS AVANCADAS (um TypographyConfig por texto) - PERSISTIDAS
  const [tagConfig, setTagConfig] = usePersistedState<TypographyConfig>('single_tag_config_full', {
    ...DEFAULT_TYPOGRAPHY,
    fontFamily: brand.fontHeadline,
    fontSize: 14,
    fontWeight: '800',
    color: brand.primaryColor,
    useUppercase: true,
    letterSpacing: 1,
  });
  const [headlineConfig, setHeadlineConfig] = usePersistedState<TypographyConfig>('single_headline_config_full', {
    ...DEFAULT_TYPOGRAPHY,
    fontFamily: brand.fontHeadline,
    fontSize: 48,
    fontWeight: '800',
    color: brand.textColor,
    lineHeight: 1.05,
    letterSpacing: -1.5,
  });
  const [highlightConfig, setHighlightConfig] = usePersistedState<TypographyConfig>('single_highlight_config_full', {
    ...DEFAULT_TYPOGRAPHY,
    fontFamily: brand.fontHeadline,
    fontSize: 24,
    fontWeight: '700',
    color: brand.primaryColor,
  });
  const [sublineConfig, setSublineConfig] = usePersistedState<TypographyConfig>('single_subline_config_full', {
    ...DEFAULT_TYPOGRAPHY,
    fontFamily: brand.fontBody,
    fontSize: 14,
    fontWeight: '400',
    color: brand.accentTextColor,
    lineHeight: 1.5,
  });
  const [ctaConfig, setCtaConfig] = usePersistedState<TypographyConfig>('single_cta_config_full', {
    ...DEFAULT_TYPOGRAPHY,
    fontFamily: brand.fontHeadline,
    fontSize: 14,
    fontWeight: '700',
    color: brand.backgroundColor,
    useUppercase: true,
    letterSpacing: 0.5,
  });

  // MODO DE EDICAO: 'auto' = layout pre-definido | 'free' = posicionamento livre
  const [editMode, setEditMode] = usePersistedState<'auto' | 'free'>('single_edit_mode', 'auto');
  const [freeLayers, setFreeLayers] = useState<CanvasLayer[]>([]);

  // Galeria de imagens geradas
  const [generatedGallery, setGeneratedGallery] = useState<string[]>([]);

  // Registrar estado + função de load para o componente pai poder salvar/carregar projetos
  useEffect(() => {
    if (!onRegisterControls) return;
    onRegisterControls({
      state: {
        format,
        bgPrompt,
        bgImage,
        referenceImage,
        logoImage,
        logoPosition,
        logoScale,
        useGradient,
        gradientColor1,
        gradientColor2,
        gradientAngle,
        gradientOpacity,
        showBrandGlows,
        glowIntensity,
        tagConfig,
        headlineConfig,
        highlightConfig,
        sublineConfig,
        ctaConfig,
        personImage,
        personPosition,
        personScale,
        personFlipped,
        personShadow,
        personGlow,
        personBottomFade,
        showText,
        showTopBar,
        showTag,
        showHandle,
        showBadge,
        customTopText,
        tag,
        headline,
        highlightText,
        subline,
        ctaText,
        showCta,
        headlineFont,
        textAlignment,
        selectedBadge,
        generatedGallery,
        editMode,
        selectedModel,
        artDirection,
        visualCategory,
        artBriefing,
      },
      load: (data: any) => {
        if (data.format) setFormat(data.format);
        if ('bgPrompt' in data) setBgPrompt(data.bgPrompt);
        if ('bgImage' in data) setBgImage(data.bgImage);
        if ('referenceImage' in data) setReferenceImage(data.referenceImage);
        if ('logoImage' in data) setLogoImage(data.logoImage);
        if (data.logoPosition) setLogoPosition(data.logoPosition);
        if (typeof data.logoScale === 'number') setLogoScale(data.logoScale);
        if (typeof data.useGradient === 'boolean') setUseGradient(data.useGradient);
        if (typeof data.gradientColor1 === 'string') setGradientColor1(data.gradientColor1);
        if (typeof data.gradientColor2 === 'string') setGradientColor2(data.gradientColor2);
        if (typeof data.gradientAngle === 'number') setGradientAngle(data.gradientAngle);
        if (typeof data.gradientOpacity === 'number') setGradientOpacity(data.gradientOpacity);
        if (typeof data.showBrandGlows === 'boolean') setShowBrandGlows(data.showBrandGlows);
        if (typeof data.glowIntensity === 'number') setGlowIntensity(data.glowIntensity);
        if (data.tagConfig) setTagConfig(data.tagConfig);
        if (data.headlineConfig) setHeadlineConfig(data.headlineConfig);
        if (data.highlightConfig) setHighlightConfig(data.highlightConfig);
        if (data.sublineConfig) setSublineConfig(data.sublineConfig);
        if (data.ctaConfig) setCtaConfig(data.ctaConfig);
        if ('personImage' in data) setPersonImage(data.personImage);
        if (data.personPosition) setPersonPosition(data.personPosition);
        if (typeof data.personScale === 'number') setPersonScale(data.personScale);
        if (typeof data.personFlipped === 'boolean') setPersonFlipped(data.personFlipped);
        if (typeof data.personShadow === 'boolean') setPersonShadow(data.personShadow);
        if (typeof data.personGlow === 'boolean') setPersonGlow(data.personGlow);
        if (typeof data.personBottomFade === 'boolean') setPersonBottomFade(data.personBottomFade);
        if (typeof data.showText === 'boolean') setShowText(data.showText);
        if (typeof data.showTopBar === 'boolean') setShowTopBar(data.showTopBar);
        if (typeof data.showTag === 'boolean') setShowTag(data.showTag);
        if (typeof data.showHandle === 'boolean') setShowHandle(data.showHandle);
        if (typeof data.showBadge === 'boolean') setShowBadge(data.showBadge);
        if ('customTopText' in data) setCustomTopText(data.customTopText || '');
        if ('tag' in data) setTag(data.tag || '');
        if ('headline' in data) setHeadline(data.headline || '');
        if ('highlightText' in data) setHighlightText(data.highlightText || '');
        if ('subline' in data) setSubline(data.subline || '');
        if ('ctaText' in data) setCtaText(data.ctaText || '');
        if (typeof data.showCta === 'boolean') setShowCta(data.showCta);
        if (data.headlineFont) setHeadlineFont(data.headlineFont);
        if (data.textAlignment) setTextAlignment(data.textAlignment);
        if ('selectedBadge' in data) setSelectedBadge(data.selectedBadge);
        if (Array.isArray(data.generatedGallery)) setGeneratedGallery(data.generatedGallery);
        if (data.editMode === 'auto' || data.editMode === 'free') setEditMode(data.editMode);
        if (typeof data.selectedModel === 'string') setSelectedModel(data.selectedModel);
        if (data.artDirection) setArtDirection(data.artDirection);
        if (data.visualCategory) setVisualCategory(data.visualCategory);
        if (typeof data.artBriefing === 'string') setArtBriefing(data.artBriefing);
      },
    });
  }, [
    onRegisterControls,
    format,
    bgPrompt,
    bgImage,
    referenceImage,
    logoImage,
    logoPosition,
    logoScale,
    useGradient,
    gradientColor1,
    gradientColor2,
    gradientAngle,
    gradientOpacity,
    showBrandGlows,
    glowIntensity,
    tagConfig,
    headlineConfig,
    highlightConfig,
    sublineConfig,
    ctaConfig,
    personImage,
    personPosition,
    personScale,
    personFlipped,
    personShadow,
    personGlow,
    personBottomFade,
    showText,
    showTopBar,
    showTag,
    showHandle,
    showBadge,
    customTopText,
    tag,
    headline,
    highlightText,
    subline,
    ctaText,
    showCta,
    headlineFont,
    textAlignment,
    selectedBadge,
    generatedGallery,
    editMode,
    selectedModel,
    artDirection,
    visualCategory,
    artBriefing,
  ]);

  // Sincronizar imagem externa enviada do Estúdio de Poses
  useEffect(() => {
    if (externalPersonImage) {
      setPersonImage(externalPersonImage);
      if (onClearExternalPerson) onClearExternalPerson();
    }
  }, [externalPersonImage, onClearExternalPerson]);

  // Atualizar fonte e logo ao mudar a marca
  useEffect(() => {
    setHeadlineFont(brand.fontHeadline);
    if (brand.logoUrl) setLogoImage(brand.logoUrl);
  }, [brand]);

  const formatMap = {
    '4:5': { width: 1080, height: 1350, className: 'aspect-[4/5]', label: 'Feed Instagram (1080x1350)' },
    '1:1': { width: 1080, height: 1080, className: 'aspect-square', label: 'Quadrado (1080x1080)' },
    '9:16': { width: 1080, height: 1920, className: 'aspect-[9/16]', label: 'Stories / Reels (1080x1920)' },
    '16:9': { width: 1920, height: 1080, className: 'aspect-[16/9]', label: 'YouTube Thumbnail (1920x1080)' },
  };
  const currentFormat = formatMap[format];

  // Upload handlers
  const handleUploadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPerson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPersonImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadReference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Gerar background via IA (com ou sem referência anexada)
  const handleGenerateBg = async () => {
    if (!apiKey) {
      setBgError('Configure sua chave de API no topo antes de gerar.');
      return;
    }
    if (!bgPrompt && !referenceImage && !artDirection && !visualCategory && !artBriefing) {
      setBgError('Digite um prompt ou anexe uma imagem de referência visual.');
      return;
    }

    setIsGeneratingBg(true);
    setBgError(null);

    try {
      const endpoint = '/api/generate-image';
      const sizeMap = {
        '16:9': '1920x1080',
        '9:16': '1080x1920',
        '4:5': '1080x1350',
        '1:1': '1024x1024',
      };

      const promptToUse = composePromptForGeneration();
      const identityImage = getIdentityImage();

      const requestBody: any = {
        prompt: promptToUse,
        size: sizeMap[format],
        aspectRatio: format,
        preferredModel: selectedModel !== 'auto' ? selectedModel : undefined,
        apiKey,
      };

      if (identityImage) {
        requestBody.imageBase64 = await optimizeImageDataUrl(identityImage);
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar background.');

      setBgImage(data.imageUrl);
      setGeneratedGallery((prev) => [data.imageUrl, ...prev]);
      // Log no console para fácil verificação de qual modelo foi usado
      console.log(
        `%c[Imagem gerada com sucesso]%c Modelo: ${data.modelUsed || 'desconhecido'} | Provider: ${data.provider || 'desconhecido'}`,
        'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
        'color: #10b981;'
      );
    } catch (err: any) {
      setBgError(err.message || 'Erro ao comunicar com a IA.');
    } finally {
      setIsGeneratingBg(false);
    }
  };

  // VARIAÇÕES EM MASSA - gera N imagens com o mesmo prompt
  const handleBulkGenerate = async () => {
    if (!apiKey) {
      setBgError('Configure sua chave de API antes.');
      return;
    }
    if (!bgPrompt && !referenceImage && !artDirection && !visualCategory && !artBriefing) {
      setBgError('Digite um prompt antes de gerar variações.');
      return;
    }
    setIsBulkGenerating(true);
    setBulkVariations([]);
    setBgError(null);

    const sizeMap: any = {
      '16:9': '1920x1080',
      '9:16': '1080x1920',
      '4:5': '1080x1350',
      '1:1': '1024x1024',
    };

    const promptToUse = composePromptForGeneration();
    const optimizedIdentity = getIdentityImage()
      ? await optimizeImageDataUrl(getIdentityImage()!)
      : null;

    const variations: string[] = [];
    for (let i = 0; i < variationsCount; i++) {
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptToUse,
            size: sizeMap[format],
            aspectRatio: format,
            preferredModel: selectedModel !== 'auto' ? selectedModel : undefined,
            apiKey,
            ...(optimizedIdentity ? { imageBase64: optimizedIdentity } : {}),
          }),
        });
        const data = await res.json();
        if (res.ok && data.imageUrl) {
          variations.push(data.imageUrl);
          setBulkVariations([...variations]);
        }
      } catch (err) {
        console.error('Erro na variação', i, err);
      }
    }

    // Adiciona todas à galeria principal também
    if (variations.length > 0) {
      setGeneratedGallery((prev) => [...variations, ...prev]);
      // Usa a primeira como background atual
      setBgImage(variations[0]);
    }

    setIsBulkGenerating(false);
  };

  // REFINAMENTO ITERATIVO - pega imagem atual e refina com instrução
  const handleRefine = async () => {
    if (!apiKey) {
      setBgError('Configure sua chave de API antes.');
      return;
    }
    if (!bgImage) {
      setBgError('Gere uma imagem primeiro para refinar.');
      return;
    }
    if (!refinementInstruction.trim()) {
      setBgError('Digite uma instrução de refinamento (ex: "mude a iluminação para azul neon").');
      return;
    }

    setIsRefining(true);
    setBgError(null);

    const sizeMap: any = {
      '16:9': '1920x1080',
      '9:16': '1080x1920',
      '4:5': '1080x1350',
      '1:1': '1024x1024',
    };

    // Prepara a imagem atual para usa-la como referencia no refinamento.
    const base64Image = await optimizeImageDataUrl(bgImage);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${refinementInstruction}. Maintain the composition and style of the reference image but apply this change.`,
          size: sizeMap[format],
          aspectRatio: format,
          preferredModel: selectedModel !== 'auto' ? selectedModel : undefined,
          apiKey,
          imageBase64: base64Image,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao refinar.');

      // Adiciona ao histórico e aplica
      setRefinementHistory((prev) => [
        { instruction: refinementInstruction, result: data.imageUrl },
        ...prev,
      ]);
      setBgImage(data.imageUrl);
      setGeneratedGallery((prev) => [data.imageUrl, ...prev]);
      setRefinementInstruction('');
    } catch (err: any) {
      setBgError(err.message || 'Erro ao refinar.');
    } finally {
      setIsRefining(false);
    }
  };

  // MESTRE DOS PROMPTS - chama o endpoint que usa OpenAI Chat para otimizar
  const handleMasterPrompt = async () => {
    if (!apiKey) {
      setBgError('Configure sua chave de API antes.');
      return;
    }
    if (!masterPromptInput.trim()) {
      setBgError('Digite um brief ou prompt para o Mestre otimizar.');
      return;
    }

    setIsOptimizingPrompt(true);
    setBgError(null);

    try {
      const res = await fetch('/api/master-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: masterPromptInput,
          apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no Mestre dos Prompts.');

      // Substitui o prompt do usuário pelo otimizado
      setBgPrompt(data.prompt);
      setMasterPromptLog((prev) => [
        `📝 Brief: ${masterPromptInput}\n✨ Prompt otimizado: ${data.prompt}`,
        ...prev,
      ].slice(0, 5));
      setMasterPromptInput('');
    } catch (err: any) {
      setBgError(err.message || 'Erro no Mestre dos Prompts.');
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  // Exportação do criativo em PNG e PSD.
  const [exportingPsd, setExportingPsd] = useState<'exact' | 'editable' | null>(null);

  const waitForPaint = () => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const withCleanExportCanvas = async <T,>(
    action: (element: HTMLElement) => Promise<T>
  ): Promise<T> => {
    const previousSelection = selectedCanvasEl;
    if (previousSelection) {
      setSelectedCanvasEl(null);
      await waitForPaint();
    }

    const element = document.getElementById('single-creative-canvas');
    if (!element) throw new Error('Abra o modo Layout Auto para exportar o criativo.');
    const originalStyle = element.style.cssText;
    element.style.setProperty('background-color', 'transparent', 'important');
    element.style.setProperty('border', 'none', 'important');
    element.style.setProperty('border-radius', '0', 'important');
    element.style.setProperty('box-shadow', 'none', 'important');

    try {
      return await action(element);
    } finally {
      element.style.cssText = originalStyle;
      if (previousSelection) setSelectedCanvasEl(previousSelection);
    }
  };

  const captureCanvasPng = async (element: HTMLElement, targetLayer?: string) => toPng(element, {
    pixelRatio: 1,
    canvasWidth: currentFormat.width,
    canvasHeight: currentFormat.height,
    cacheBust: true,
    backgroundColor: 'transparent',
    filter: targetLayer
      ? (node) => {
          const layer = (node as HTMLElement).dataset?.psdLayer;
          return !layer || layer === targetLayer;
        }
      : undefined,
  });

  const getPsdFileBase = () =>
    `${brand.name}-criativo-${format.replace(':', 'x')}`;

  const handleDownloadCanvas = async () => {
    try {
      const dataUrl = await withCleanExportCanvas((element) => captureCanvasPng(element));
      saveAs(dataUrl, `${getPsdFileBase().toLowerCase().replace(/\s+/g, '-')}.png`);
    } catch (error) {
      console.error('Erro ao baixar canvas:', error);
      alert(error instanceof Error ? error.message : 'Não foi possível baixar o PNG.');
    }
  };

  const handleExportExactPsd = async () => {
    setExportingPsd('exact');
    try {
      await withCleanExportCanvas(async (element) => {
        const dataUrl = await captureCanvasPng(element);
        const canvas = await dataUrlToCanvas(dataUrl, currentFormat.width, currentFormat.height);
        await exportExactPsd(canvas, `${getPsdFileBase()}-exato`);
      });
    } catch (error) {
      alert(`Erro ao gerar PSD exato: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    } finally {
      setExportingPsd(null);
    }
  };

  const handleExportEditablePsd = async () => {
    setExportingPsd('editable');
    try {
      await withCleanExportCanvas(async (element) => {
        const finalDataUrl = await captureCanvasPng(element);
        const finalCanvas = await dataUrlToCanvas(finalDataUrl, currentFormat.width, currentFormat.height);
        const layerDefinitions = [
          ['cta', 'CTA / Botão'],
          ['subline', 'Texto / Subtítulo'],
          ['highlight', 'Texto / Destaque'],
          ['headline', 'Texto / Headline'],
          ['tag', 'Texto / Tag'],
          ['topbar', 'Barra superior / Tag / Selo'],
          ['text-overlay', 'Degradê de contraste dos textos'],
          ['logo', 'Logo'],
          ['person', 'Pessoa'],
          ['brand-glows', 'Glows da marca'],
          ['contrast-overlay', 'Contraste do fundo'],
          ['background', 'Fundo'],
        ] as const;

        const layers = [];
        for (const [id, name] of layerDefinitions) {
          if (!element.querySelector(`[data-psd-layer="${id}"]`)) continue;
          const layerDataUrl = await captureCanvasPng(element, id);
          layers.push({
            id,
            name,
            canvas: await dataUrlToCanvas(layerDataUrl, currentFormat.width, currentFormat.height),
          });
        }

        await exportEditablePsd({
          finalCanvas,
          layers,
          nativeTextLayers: collectNativeTextLayers(element),
          fileName: `${getPsdFileBase()}-editavel`,
        });
      });
    } catch (error) {
      alert(`Erro ao gerar PSD editável: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    } finally {
      setExportingPsd(null);
    }
  };

  const collectNativeTextLayers = (element: HTMLElement): PsdNativeTextLayer[] => {
    const rootRect = element.getBoundingClientRect();
    const scaleX = currentFormat.width / rootRect.width;
    const scaleY = currentFormat.height / rootRect.height;
    const definitions = [
      { id: 'tag', name: 'Texto nativo / Tag', text: tag, config: tagConfig, color: tagConfig.color },
      { id: 'headline', name: 'Texto nativo / Headline', text: headline, config: headlineConfig, color: headlineConfig.color },
      { id: 'highlight', name: 'Texto nativo / Destaque', text: highlightText, config: highlightConfig, color: highlightConfig.color },
      { id: 'subline', name: 'Texto nativo / Subtítulo', text: subline, config: sublineConfig, color: sublineConfig.color },
      {
        id: 'cta',
        name: 'Texto nativo / CTA',
        text: ctaText,
        config: ctaConfig,
        color: ctaConfig.highlightEnabled ? ctaConfig.highlightColor : brand.backgroundColor,
      },
    ];

    return definitions.flatMap(({ id, name, text, config, color }) => {
      const node = element.querySelector<HTMLElement>(`[data-psd-native-text="${id}"]`);
      if (!node || !text || !config.visible) return [];
      const rect = node.getBoundingClientRect();
      const fontScale = Math.min(scaleX, scaleY);
      return [{
        id,
        name,
        text,
        x: (rect.left - rootRect.left) * scaleX,
        y: (rect.top - rootRect.top) * scaleY + config.fontSize * fontScale,
        width: rect.width * scaleX,
        height: rect.height * scaleY,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize * fontScale,
        fontWeight: config.fontWeight,
        color,
        textAlign: config.textAlign,
        lineHeight: config.lineHeight,
        letterSpacing: config.letterSpacing * fontScale,
        uppercase: config.useUppercase,
        underline: config.useUnderline,
      }];
    });
  };

  const logoPresetX = logoPosition.includes('left')
    ? 0
    : logoPosition.includes('right')
    ? 100
    : 50;
  const logoPresetY = logoPosition.includes('top')
    ? 0
    : logoPosition.includes('bottom')
    ? 100
    : 50;
  const logoTransform = logoXY
    ? 'translate(-50%, -50%)'
    : `translate(${logoPosition.includes('left') ? '0' : logoPosition.includes('right') ? '-100%' : '-50%'}, ${
        logoPosition.includes('top') ? '0' : logoPosition.includes('bottom') ? '-100%' : '-50%'
      })`;


  return (
    <div className="space-y-8">
      {/* BARRA SUPERIOR DE FORMATOS E TÍTULO */}
      <div className="p-6 rounded-3xl bg-[#0e111a] border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon size={22} className="text-brand-400" />
            Criador de Anúncio Único & Thumbnails
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Crie anúncios de alta conversão combinando pessoas reais, referências, logos, selos e tipografia da marca.
          </p>
        </div>

        {/* Toggle: Modo Auto / Livre */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setEditMode('auto')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              editMode === 'auto' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            🎯 Layout Auto
          </button>
          <button
            onClick={() => setEditMode('free')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              editMode === 'free' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            🤖 Templates IA
          </button>
        </div>

        {/* Seletor de Formato */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10 self-start md:self-auto flex-wrap">
          {(['4:5', '1:1', '9:16', '16:9'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                format === f ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === '4:5' && 'Feed 4:5'}
              {f === '1:1' && 'Quadrado 1:1'}
              {f === '9:16' && 'Story 9:16'}
              {f === '16:9' && 'Thumb 16:9'}
            </button>
          ))}
        </div>
      </div>

      {/* ÁREA PRINCIPAL: CANVAS (COLUNA ESQUERDA) + CONTROLES (COLUNA DIREITA) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: CANVAS PREVIEW (8 COLS - maior para melhor visualizacao) */}
        <div className="xl:col-span-8 flex flex-col items-center">
          <div className="w-full max-w-[680px]">
            {editMode === 'free' ? (
              // MODO TEMPLATES: Sistema de templates automaticos com IA
              <SmartTemplates
                onApplyTemplate={(template, config) => {
                  // Aplica a config do template no canvas
                  setTag(config.texts.tag);
                  setHeadline(config.texts.headline);
                  setHighlightText(config.texts.highlight);
                  setSubline(config.texts.subline);
                  setCtaText(config.texts.cta);
                  // Aplica tipografia
                  setHeadlineConfig({
                    ...DEFAULT_TYPOGRAPHY,
                    fontFamily: brand.fontHeadline,
                    fontSize: config.typography.headlineSize,
                    fontWeight: config.typography.headlineWeight,
                    color: brand.textColor,
                    textAlign: config.layout.headlinePosition.align,
                  });
                  setTagConfig({
                    ...DEFAULT_TYPOGRAPHY,
                    fontFamily: brand.fontHeadline,
                    fontSize: config.typography.tagSize,
                    fontWeight: config.typography.tagWeight,
                    color: brand.primaryColor,
                    useUppercase: config.typography.tagCaps,
                    textAlign: config.layout.tagPosition.align,
                  });
                  setHighlightConfig({
                    ...DEFAULT_TYPOGRAPHY,
                    fontFamily: brand.fontHeadline,
                    fontSize: config.typography.highlightSize,
                    fontWeight: '700',
                    color: brand.primaryColor,
                    textAlign: config.layout.highlightPosition.align,
                  });
                  setSublineConfig({
                    ...DEFAULT_TYPOGRAPHY,
                    fontFamily: brand.fontBody,
                    fontSize: config.typography.sublineSize,
                    fontWeight: '400',
                    color: brand.accentTextColor,
                    textAlign: config.layout.sublinePosition.align,
                  });
                  setCtaConfig({
                    ...DEFAULT_TYPOGRAPHY,
                    fontFamily: brand.fontHeadline,
                    fontSize: config.typography.ctaSize,
                    fontWeight: config.typography.ctaWeight,
                    color: brand.backgroundColor,
                    useUppercase: config.typography.ctaCaps,
                    textAlign: config.layout.ctaPosition.align,
                  });
                  // Aplica background
                  setUseGradient(config.visual.useGradientBg);
                  setGradientColor1(config.visual.gradientColor1);
                  setGradientColor2(config.visual.gradientColor2);
                  setGradientAngle(config.visual.gradientAngle);
                  setGlowIntensity(config.visual.glowIntensity);
                  setEditMode('auto');
                }}
              />
            ) : (
              // MODO AUTO: Layout pre-definido (canvas atual)
              <>
                {/* O CANVAS RENDERIZADO - com background cinza claro para visualização real */}
                <div
                  id="single-creative-canvas"
                  className={`relative w-full ${currentFormat.className} overflow-hidden rounded-2xl shadow-2xl border-2 border-white/20 select-none`}
                  style={{
                    backgroundColor: '#f0f0f0', // Fundo cinza para visualização real (contraste com a página escura)
                color: brand.textColor,
                fontFamily: brand.fontBody,
              }}
            >
              {/* CAMADA 1: BACKGROUND (IMAGEM OU GRADIENTE) */}
              {bgImage ? (
                <img
                  data-psd-layer="background"
                  src={bgImage}
                  alt="Background"
                  draggable={false}
                  style={buildBackgroundImageStyle({ scale: bgScale, offsetX: bgOffsetX, offsetY: bgOffsetY })}
                />
              ) : (
                <div
                  data-psd-layer="background"
                  className="absolute inset-0"
                  style={{
                    background: useGradient
                      ? `linear-gradient(${gradientAngle}deg, ${gradientColor1} 0%, ${gradientColor2} 100%)`
                      : gradientColor1,
                    opacity: gradientOpacity / 100,
                  }}
                />
              )}

              {/* CAMADA 2: OVERLAY GRADIENTE PARA CONTRASTE */}
              {/* Quando tem imagem de fundo, usa overlay escuro. Quando é só degradê, deixa transparente */}
              {bgImage && (
                <div
                  data-psd-layer="contrast-overlay"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      textAlignment === 'left' && personPosition === 'right'
                        ? `linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 45%, transparent 100%)`
                        : `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)`,
                  }}
                />
              )}

              {/* CAMADA 3: GLOWS DA MARCA (opcional, com intensidade ajustável) */}
              {showBrandGlows && (
                <>
                  <div
                    data-psd-layer="brand-glows"
                    className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
                    style={{ backgroundColor: brand.primaryColor, opacity: glowIntensity / 100 }}
                  />
                  <div
                    data-psd-layer="brand-glows"
                    className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
                    style={{ backgroundColor: brand.secondaryColor, opacity: (glowIntensity / 100) * 0.6 }}
                  />
                </>
              )}

              {/* CAMADA 4: LOGO DO CLIENTE / MARCA - posicionado via sliders X/Y */}
              {logoImage && (
                <div
                  data-psd-layer="logo"
                  className={`absolute z-30 p-6 sm:p-8 ${selectedCanvasEl === 'logo' ? 'outline outline-2 outline-emerald-400 outline-offset-[-8px]' : ''}`}
                  style={{
                    left: `${logoXY?.x ?? logoPresetX}%`,
                    right: 'auto',
                    top: `${logoXY?.y ?? logoPresetY}%`,
                    transform: logoTransform,
                  }}
                >
                  <img
                    src={logoImage}
                    alt="Logo"
                    className="object-contain filter drop-shadow-md pointer-events-none"
                    style={{
                      height: `${(logoScale / 100) * 42}px`,
                      maxWidth: '160px',
                    }}
                    draggable={false}
                  />
                </div>
              )}

              {/* CAMADA 5: PESSOA REAL - com posicao livre via sliders */}
              {personImage && (
                <div
                  data-psd-layer="person"
                  className="absolute pointer-events-none transition-all duration-200 z-10"
                  style={{
                    bottom: `${personXY?.y ?? personBottomOffset}%`,
                    left: personXY ? `${personXY.x}%` : (personPosition === 'right' ? 'auto' : '0'),
                    right: personXY ? 'auto' : (personPosition === 'right' ? '0' : 'auto'),
                    transform: personXY
                      ? `translateX(-50%) ${personFlipped ? 'scaleX(-1)' : ''}`
                      : `${personPosition === 'center' ? 'translateX(-50%)' : ''} ${personFlipped ? 'scaleX(-1)' : ''}`,
                    width: `${personScale}%`,
                    maxWidth: format === '16:9' ? '55%' : '85%',
                  }}
                >
                  {/* Glow atrás da pessoa */}
                  {personGlow && (
                    <div
                      className="absolute inset-0 rounded-full blur-[60px] opacity-50 -z-10 scale-95"
                      style={{ backgroundColor: brand.primaryColor }}
                    />
                  )}

                  {/* Foto da pessoa */}
                  <img
                    src={personImage}
                    alt="Pessoa Real"
                    className="w-full h-auto object-contain block"
                    style={{
                      filter: personShadow ? 'drop-shadow(0 20px 30px rgba(0,0,0,0.75))' : 'none',
                      maskImage: personBottomFade
                        ? 'linear-gradient(to bottom, black 80%, transparent 100%)'
                        : 'none',
                      WebkitMaskImage: personBottomFade
                        ? 'linear-gradient(to bottom, black 80%, transparent 100%)'
                        : 'none',
                    }}
                  />
                </div>
              )}

              {/* CAMADA 5.5: OVERLAY DE DEGRADÊ PARA CONTRASTE DE LEITURA */}
              {textOverlay.enabled && (
                <div
                  data-psd-layer="text-overlay"
                  className="absolute z-15 pointer-events-none"
                  style={{
                    ...(textOverlay.startPosition === 'top'
                      ? { top: 0 }
                      : textOverlay.startPosition === 'bottom'
                      ? { bottom: 0 }
                      : { top: `${(100 - textOverlay.heightPercent) / 2}%` }),
                    left: 0,
                    ...buildOverlayStyle(textOverlay),
                  }}
                />
              )}

              {/* CAMADA 6: TEXTOS E ELEMENTOS DO ANÚNCIO */}
              {showText && (
                <div
                  className="relative z-20 w-full h-full p-6 sm:p-10"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    ...(selectedCanvasEl === 'text'
                      ? { cursor: 'move' }
                      : {}),
                  }}
                >
                  <div
                    style={{
                      ...buildContainerStyle(
                        { ...headlineConfig, verticalAlign: 'bottom' },
                        'bottom'
                      ),
                      ...(selectedCanvasEl === 'text' ? { paddingTop: '20px' } : {}),
                    }}
                  >
                  {/* TOPO: BARRA SUPERIOR 100% EDITAVEL POR ELEMENTO COM POSICAO X/Y */}
                  {showTopBar && (
                    <div
                      className={`flex items-center gap-3 flex-wrap self-stretch mb-3 ${logoPosition === 'top-left' && logoImage ? 'mt-8 sm:mt-10' : ''}`}
                      style={{
                        position: tagPos ? 'absolute' : 'static',
                        left: tagPos ? `${tagPos.x}%` : undefined,
                        top: tagPos ? `${tagPos.y}%` : undefined,
                        transform: tagPos ? 'translate(-50%, -50%)' : undefined,
                        zIndex: tagPos ? 20 : undefined,
                      }}
                    >
                      {/* TAG com tipografia customizada */}
                      {showTag && tag && tagConfig.visible && (
                        <span
                          data-psd-layer="tag"
                          data-psd-native-text="tag"
                          className="inline-flex items-center gap-1.5 shadow-sm"
                          style={{
                            ...buildTextStyle(tagConfig),
                            backgroundColor: tagConfig.highlightEnabled
                              ? tagConfig.highlightColor
                              : `${tagConfig.color}25`,
                            borderLeft: `3px solid ${tagConfig.color}`,
                            padding: `${tagConfig.highlightPaddingY}px ${tagConfig.highlightPaddingX}px`,
                            borderRadius: `${tagConfig.highlightBorderRadius}px`,
                          }}
                        >
                          {tag}
                        </span>
                      )}

                      {/* HANDLE / TEXTO CUSTOMIZADO */}
                      {showHandle && (
                        <span
                          data-psd-layer="topbar"
                          className="text-[11px] font-bold tracking-tight opacity-75"
                          style={{ color: brand.textColor }}
                        >
                          {customTopText || brand.handle || brand.name}
                        </span>
                      )}

                      {/* SELO DE AUTORIDADE / BADGE */}
                      {showBadge && selectedBadge === 'stars' && (
                        <span data-psd-layer="topbar" className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                          <Star size={11} className="fill-amber-400" /> 5.0 (Avaliação Máxima)
                        </span>
                      )}
                      {showBadge && selectedBadge === 'verified' && (
                        <span data-psd-layer="topbar" className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                          <Shield size={11} /> 100% Verificado
                        </span>
                      )}
                      {showBadge && selectedBadge === 'bestseller' && (
                        <span data-psd-layer="topbar" className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-400/20 text-purple-300 text-[10px] font-bold border border-purple-400/30">
                          <Award size={11} /> Mais Vendido
                        </span>
                      )}
                    </div>
                  )}

                  {/* MEIO/BASE: TEXTOS PRINCIPAIS - com posicao X/Y via sliders */}
                  <div
                    className={`flex flex-col w-full ${
                      personPosition === 'right' && textAlignment === 'left' ? 'max-w-[62%]' : 'max-w-full'
                    }`}
                    style={{
                      gap: `${headlineConfig.lineHeight * 0.7}em`,
                      textAlign: headlineConfig.textAlign,
                      alignItems:
                        headlineConfig.textAlign === 'center'
                          ? 'center'
                          : headlineConfig.textAlign === 'right'
                          ? 'flex-end'
                          : 'flex-start',
                    }}
                  >
                    {/* HEADLINE PRINCIPAL */}
                    {headlineConfig.visible && headline && (
                      <h1
                        data-psd-layer="headline"
                        data-psd-native-text="headline"
                        style={{
                          ...buildTextStyle(headlineConfig),
                          margin: 0,
                          position: headlinePos ? 'absolute' : 'static',
                          left: headlinePos ? `${headlinePos.x}%` : undefined,
                          top: headlinePos ? `${headlinePos.y}%` : undefined,
                          transform: headlinePos ? 'translate(-50%, -50%)' : undefined,
                          maxWidth: headlinePos ? '500px' : undefined,
                          width: headlinePos ? '90%' : undefined,
                          fontSize: `${
                            format === '16:9'
                              ? headlineConfig.fontSize * 0.9
                              : format === '9:16'
                              ? headlineConfig.fontSize * 1.1
                              : headlineConfig.fontSize
                          }px`,
                        }}
                      >
                        {headline}
                      </h1>
                    )}

                    {/* FRASE DE DESTAQUE - com posicao X/Y */}
                    {highlightConfig.visible && highlightText && (
                      <p
                        data-psd-layer="highlight"
                        data-psd-native-text="highlight"
                        style={{
                          ...buildTextStyle(highlightConfig),
                          margin: 0,
                          position: highlightPos ? 'absolute' : 'static',
                          left: highlightPos ? `${highlightPos.x}%` : undefined,
                          top: highlightPos ? `${highlightPos.y}%` : undefined,
                          transform: highlightPos ? 'translate(-50%, -50%)' : undefined,
                          fontSize: `${
                            format === '16:9'
                              ? highlightConfig.fontSize * 0.85
                              : highlightConfig.fontSize
                          }px`,
                          backgroundColor: highlightConfig.highlightEnabled ? highlightConfig.highlightColor : 'transparent',
                          padding: highlightConfig.highlightEnabled
                            ? `${highlightConfig.highlightPaddingY}px ${highlightConfig.highlightPaddingX}px`
                            : '0',
                          borderRadius: highlightConfig.highlightEnabled ? `${highlightConfig.highlightBorderRadius}px` : '0',
                          display: highlightConfig.highlightEnabled ? 'inline-block' : 'inline',
                          width: highlightConfig.highlightEnabled ? 'fit-content' : 'auto',
                          maxWidth: '90%',
                        }}
                      >
                        {highlightText}
                      </p>
                    )}

                    {/* SUBTITULO - com posicao X/Y */}
                    {sublineConfig.visible && subline && (
                      <p
                        data-psd-layer="subline"
                        data-psd-native-text="subline"
                        style={{
                          ...buildTextStyle(sublineConfig),
                          margin: 0,
                          position: sublinePos ? 'absolute' : 'static',
                          left: sublinePos ? `${sublinePos.x}%` : undefined,
                          top: sublinePos ? `${sublinePos.y}%` : undefined,
                          transform: sublinePos ? 'translate(-50%, -50%)' : undefined,
                          fontSize: `${
                            format === '16:9'
                              ? sublineConfig.fontSize * 0.85
                              : sublineConfig.fontSize
                          }px`,
                          backgroundColor: sublineConfig.highlightEnabled ? sublineConfig.highlightColor : 'transparent',
                          padding: sublineConfig.highlightEnabled
                            ? `${sublineConfig.highlightPaddingY}px ${sublineConfig.highlightPaddingX}px`
                            : '0',
                          borderRadius: sublineConfig.highlightEnabled
                            ? `${sublineConfig.highlightBorderRadius}px`
                            : '0',
                          display: sublineConfig.highlightEnabled ? 'inline-block' : 'block',
                          width: sublineConfig.highlightEnabled ? 'fit-content' : 'auto',
                        }}
                      >
                        {subline}
                      </p>
                    )}

                    {/* CTA */}
                    {showCta && ctaText && ctaConfig.visible && (
                      <div
                        data-psd-layer="cta"
                        className="inline-flex"
                        style={{
                          position: ctaPos ? 'absolute' : 'static',
                          left: ctaPos ? `${ctaPos.x}%` : undefined,
                          top: ctaPos ? `${ctaPos.y}%` : undefined,
                          transform: ctaPos ? 'translate(-50%, -50%)' : undefined,
                        }}
                      >
                        <span
                          data-psd-native-text="cta"
                          className="inline-flex items-center gap-2 transition-all"
                          style={{
                            ...buildTextStyle(ctaConfig),
                            backgroundColor: ctaConfig.color,
                            color: ctaConfig.highlightEnabled ? ctaConfig.highlightColor : brand.backgroundColor,
                            padding: `${ctaConfig.highlightPaddingY + 6}px ${ctaConfig.highlightPaddingX + 16}px`,
                            borderRadius: `${ctaConfig.highlightBorderRadius}px`,
                            fontSize: `${ctaConfig.fontSize}px`,
                            fontWeight: ctaConfig.fontWeight,
                            textTransform: ctaConfig.useUppercase ? 'uppercase' : 'none',
                            fontFamily: ctaConfig.fontFamily,
                            letterSpacing: `${ctaConfig.letterSpacing}px`,
                            boxShadow: ctaConfig.shadowEnabled
                              ? `${ctaConfig.shadowOffsetX}px ${ctaConfig.shadowOffsetY}px ${ctaConfig.shadowBlur}px ${ctaConfig.shadowColor}`
                              : `0 10px 25px -5px ${brand.primaryColor}50`,
                          }}
                        >
                          <MousePointerClick size={Math.max(12, ctaConfig.fontSize * 0.9)} />
                          {ctaText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )}
            </div>
              </>
            )}

            {/* BOTÕES DE AÇÃO: SALVAR + BAIXAR */}
            <div className="mt-5 space-y-2">
              <div className={`grid gap-2 ${onSaveRequest ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {onSaveRequest && (
                  <button
                    onClick={onSaveRequest}
                    className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl font-bold text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                  >
                    <Save size={13} /> Salvar
                  </button>
                )}
                <button
                  onClick={handleDownloadCanvas}
                  disabled={editMode !== 'auto' || Boolean(exportingPsd)}
                  className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl font-bold text-xs bg-gradient-to-r from-brand-500 to-emerald-400 text-dark-900 hover:opacity-95 transition-all shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={13} /> PNG
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportExactPsd}
                  disabled={editMode !== 'auto' || Boolean(exportingPsd)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-2 py-3 text-xs font-bold text-blue-200 transition-all hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  title="PSD com uma camada rasterizada, visualmente idêntica ao criativo final"
                >
                  {exportingPsd === 'exact' ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
                  {exportingPsd === 'exact' ? 'Gerando...' : 'PSD Exato'}
                </button>
                <button
                  onClick={handleExportEditablePsd}
                  disabled={editMode !== 'auto' || Boolean(exportingPsd)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-2 py-3 text-xs font-bold text-white shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                  title="PSD com fundo, pessoa, logo, efeitos e textos separados em camadas"
                >
                  {exportingPsd === 'editable' ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
                  {exportingPsd === 'editable' ? 'Gerando...' : 'PSD Editável'}
                </button>
              </div>
              <p className="px-1 text-center text-[10px] leading-relaxed text-gray-500">
                Exato preserva o visual em uma camada. Editável separa os elementos e inclui textos nativos ocultos.
              </p>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: PAINEL DE EDIÇÃO (4 COLS) */}
        <div className="xl:col-span-4 space-y-4 xl:sticky xl:top-28 xl:max-h-[calc(100vh-128px)] xl:overflow-y-auto xl:pr-2">
          {/* SEÇÃO INDEPENDENTE: POSIÇÃO INDIVIDUAL DOS TEXTOS (X/Y) */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MousePointer size={16} className="text-emerald-400" /> Posição Individual dos Textos
              </h3>
              <span className="text-[10px] text-gray-500 font-mono">X / Y (%)</span>
            </div>

            <p className="text-[10px] text-gray-500 leading-relaxed">
              💡 Mova os sliders para reposicionar cada texto individualmente no canvas. <strong className="text-emerald-300">Resetar</strong> volta para a posição automática.
            </p>

            <div className="space-y-3">
              {/* Tag */}
              {showTag && tag && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-300 uppercase">Tag / Categoria</span>
                    <button onClick={() => setTagPos(null)} className="text-[9px] text-gray-500 hover:text-white">↺ Resetar</button>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>X</span><span>{Math.round(tagPos?.x ?? 5)}%</span></div>
                  <input type="range" min="0" max="100" value={tagPos?.x ?? 5} onChange={(e) => setTagPos((p) => ({ x: Number(e.target.value), y: p?.y ?? 5 }))} className="w-full accent-amber-500" />
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>Y</span><span>{Math.round(tagPos?.y ?? 5)}%</span></div>
                  <input type="range" min="0" max="100" value={tagPos?.y ?? 5} onChange={(e) => setTagPos((p) => ({ x: p?.x ?? 5, y: Number(e.target.value) }))} className="w-full accent-amber-500" />
                </div>
              )}

              {/* Headline */}
              {headlineConfig.visible && headline && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-300 uppercase">Headline</span>
                    <button onClick={() => setHeadlinePos(null)} className="text-[9px] text-gray-500 hover:text-white">↺ Resetar</button>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>X</span><span>{Math.round(headlinePos?.x ?? 50)}%</span></div>
                  <input type="range" min="0" max="100" value={headlinePos?.x ?? 50} onChange={(e) => setHeadlinePos((p) => ({ x: Number(e.target.value), y: p?.y ?? 50 }))} className="w-full accent-emerald-500" />
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>Y</span><span>{Math.round(headlinePos?.y ?? 50)}%</span></div>
                  <input type="range" min="0" max="100" value={headlinePos?.y ?? 50} onChange={(e) => setHeadlinePos((p) => ({ x: p?.x ?? 50, y: Number(e.target.value) }))} className="w-full accent-emerald-500" />
                </div>
              )}

              {/* Destaque */}
              {highlightConfig.visible && highlightText && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-fuchsia-300 uppercase">Destaque</span>
                    <button onClick={() => setHighlightPos(null)} className="text-[9px] text-gray-500 hover:text-white">↺ Resetar</button>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>X</span><span>{Math.round(highlightPos?.x ?? 50)}%</span></div>
                  <input type="range" min="0" max="100" value={highlightPos?.x ?? 50} onChange={(e) => setHighlightPos((p) => ({ x: Number(e.target.value), y: p?.y ?? 60 }))} className="w-full accent-fuchsia-500" />
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>Y</span><span>{Math.round(highlightPos?.y ?? 60)}%</span></div>
                  <input type="range" min="0" max="100" value={highlightPos?.y ?? 60} onChange={(e) => setHighlightPos((p) => ({ x: p?.x ?? 50, y: Number(e.target.value) }))} className="w-full accent-fuchsia-500" />
                </div>
              )}

              {/* Subtítulo */}
              {sublineConfig.visible && subline && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-cyan-300 uppercase">Subtítulo</span>
                    <button onClick={() => setSublinePos(null)} className="text-[9px] text-gray-500 hover:text-white">↺ Resetar</button>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>X</span><span>{Math.round(sublinePos?.x ?? 50)}%</span></div>
                  <input type="range" min="0" max="100" value={sublinePos?.x ?? 50} onChange={(e) => setSublinePos((p) => ({ x: Number(e.target.value), y: p?.y ?? 70 }))} className="w-full accent-cyan-500" />
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>Y</span><span>{Math.round(sublinePos?.y ?? 70)}%</span></div>
                  <input type="range" min="0" max="100" value={sublinePos?.y ?? 70} onChange={(e) => setSublinePos((p) => ({ x: p?.x ?? 50, y: Number(e.target.value) }))} className="w-full accent-cyan-500" />
                </div>
              )}

              {/* CTA */}
              {showCta && ctaText && ctaConfig.visible && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-300 uppercase">CTA (botão)</span>
                    <button onClick={() => setCtaPos(null)} className="text-[9px] text-gray-500 hover:text-white">↺ Resetar</button>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>X</span><span>{Math.round(ctaPos?.x ?? 50)}%</span></div>
                  <input type="range" min="0" max="100" value={ctaPos?.x ?? 50} onChange={(e) => setCtaPos((p) => ({ x: Number(e.target.value), y: p?.y ?? 90 }))} className="w-full accent-rose-500" />
                  <div className="flex items-center justify-between text-[9px] text-gray-400"><span>Y</span><span>{Math.round(ctaPos?.y ?? 90)}%</span></div>
                  <input type="range" min="0" max="100" value={ctaPos?.y ?? 90} onChange={(e) => setCtaPos((p) => ({ x: p?.x ?? 50, y: Number(e.target.value) }))} className="w-full accent-rose-500" />
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 1: LOGO DO CLIENTE */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImgIcon size={16} className="text-amber-400" /> Logo do Cliente / Marca
              </h3>
              {logoImage && (
                <button
                  onClick={() => setLogoImage(null)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remover Logo
                </button>
              )}
            </div>

            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadLogo}
              className="hidden"
            />

            {!logoImage ? (
              <div
                onClick={() => logoFileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-white/15 hover:border-amber-500/50 rounded-2xl p-4 flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.04] transition-all text-center"
              >
                <div className="p-2 rounded-full bg-white/5 text-amber-400 mb-2">
                  <Upload size={18} />
                </div>
                <p className="text-xs font-bold text-gray-200">Anexar Logo (PNG com fundo transparente)</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Clique para selecionar do seu computador</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img src={logoImage} alt="Logo ativa" className="h-10 max-w-[110px] rounded bg-white/5 p-1 object-contain" />
                    <span className="truncate text-xs font-medium text-gray-300">Logo ativa</span>
                  </div>
                  <button
                    onClick={() => logoFileInputRef.current?.click()}
                    className="text-xs font-semibold text-brand-400 hover:underline"
                  >
                    Trocar
                  </button>
                </div>
                {/* Posição do Logo - Grid 3x3 + Slider livre X/Y */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">Posição do Logo</label>
                  {/* Grid 3x3 de atalhos */}
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {[
                      { id: 'top-left', label: '↖ Sup Esq' },
                      { id: 'top-center', label: '↑ Topo' },
                      { id: 'top-right', label: '↗ Sup Dir' },
                      { id: 'middle-left', label: '← Esquerda' },
                      { id: 'middle-center', label: '● Centro' },
                      { id: 'middle-right', label: '→ Direita' },
                      { id: 'bottom-left', label: '↙ Inf Esq' },
                      { id: 'bottom-center', label: '↓ Base' },
                      { id: 'bottom-right', label: '↘ Inf Dir' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        onClick={() => {
                          setLogoPosition(pos.id as any);
                          // Reset XY customizado quando usar preset
                          setLogoXY(null);
                        }}
                        className={`py-1.5 px-1 rounded-lg text-[9px] font-semibold border transition-all ${
                          logoPosition === pos.id && !logoXY
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                  {/* Slider livre X/Y */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 mb-0.5">
                        <span>X (horizontal)</span>
                        <span>{Math.round(logoXY?.x ?? logoPresetX)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={logoXY?.x ?? logoPresetX}
                        onChange={(e) => {
                          const x = Number(e.target.value);
                          setLogoXY((prev) => ({ x, y: prev?.y ?? logoPresetY }));
                        }}
                        className="w-full accent-amber-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 mb-0.5">
                        <span>Y (vertical)</span>
                        <span>{Math.round(logoXY?.y ?? logoPresetY)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={logoXY?.y ?? logoPresetY}
                        onChange={(e) => {
                          const y = Number(e.target.value);
                          setLogoXY((prev) => ({ x: prev?.x ?? logoPresetX, y }));
                        }}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                  {/* Slider de tamanho */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1">
                      <span>Tamanho do Logo</span>
                      <span>{logoScale}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      value={logoScale}
                      onChange={(e) => setLogoScale(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 2: IMAGEM DE REFERÊNCIA VISUAL PARA A IA */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-blue-400" /> Imagem de Referência (Estilo/Inspiração)
              </h3>
              {referenceImage && (
                <button
                  onClick={() => setReferenceImage(null)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>

            <input
              ref={refFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadReference}
              className="hidden"
            />

            {!referenceImage ? (
              <div
                onClick={() => refFileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-2xl p-4 flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.04] transition-all text-center"
              >
                <div className="p-2 rounded-full bg-white/5 text-blue-400 mb-2">
                  <Upload size={18} />
                </div>
                <p className="text-xs font-bold text-gray-200">Anexar Referência de Anúncio / Estilo</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Print de anúncio concorrente, paleta ou inspiração visual que a IA deve seguir
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2.5">
                  <img src={referenceImage} alt="ref" className="w-12 h-12 object-cover rounded-lg border border-white/10" />
                  <div>
                    <p className="text-xs text-blue-400 font-bold">Referência anexada!</p>
                    <p className="text-[10px] text-gray-400">A IA usará este estilo de iluminação e composição.</p>
                  </div>
                </div>
                <button
                  onClick={() => refFileInputRef.current?.click()}
                  className="text-xs text-gray-300 hover:text-white px-2 py-1 bg-white/5 rounded"
                >
                  Trocar
                </button>
              </div>
            )}
          </div>

          {/* SEÇÃO 3: DEGRADÊ DO FUNDO */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette size={16} className="text-emerald-400" /> Degradê / Fundo Sólido
              </h3>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useGradient}
                  onChange={(e) => setUseGradient(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-[11px] text-gray-300 font-semibold">{useGradient ? 'Degradê' : 'Cor sólida'}</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cor 1</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={gradientColor1}
                    onChange={(e) => setGradientColor1(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={gradientColor1}
                    onChange={(e) => setGradientColor1(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-mono focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              {useGradient && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cor 2</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={gradientColor2}
                      onChange={(e) => setGradientColor2(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={gradientColor2}
                      onChange={(e) => setGradientColor2(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-mono focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {useGradient && (
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-1">
                  <span>Ângulo do Degradê</span>
                  <span>{gradientAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={gradientAngle}
                  onChange={(e) => setGradientAngle(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  {[0, 90, 135, 180, 225, 270, 315, 360].slice(0, 4).map((a) => (
                    <button
                      key={a}
                      onClick={() => setGradientAngle(a)}
                      className="py-0.5 text-[10px] bg-white/5 hover:bg-white/10 rounded border border-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                      {a}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-1">
                <span>Opacidade do Fundo</span>
                <span>{gradientOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={gradientOpacity}
                onChange={(e) => setGradientOpacity(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Use o degradê para preencher enquanto a IA gera a imagem, ou baixe com 100% opacidade.
              </p>
            </div>

            {/* Controle de Glows */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                  ✨ Glows da Marca
                </label>
                <input
                  type="checkbox"
                  checked={showBrandGlows}
                  onChange={(e) => setShowBrandGlows(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-500"
                />
              </div>
              {showBrandGlows && (
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-1">
                    <span>Intensidade dos Glows</span>
                    <span>{glowIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={glowIntensity}
                    onChange={(e) => setGlowIntensity(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Reduza para 0% se quiser um fundo limpo sem cor da marca.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 3.5: DEGRADÊ DE CONTRASTE PARA TEXTOS */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-blue-400" /> Degradê de Contraste
              </h3>
            </div>
            <TextGradientOverlay config={textOverlay} onChange={setTextOverlay} />
          </div>

          {/* SEÇÃO 0: DIRETOR CRIATIVO IA - INTELIGENCIA CRIATIVA */}
          <CreativeDirectorPanel
            onApplyPrompt={(text) => setBgPrompt(text)}
            onApplyHeadline={(text) => setHeadline(text)}
            onApplyHighlight={(text) => setHighlightText(text)}
            onApplySubline={(text) => setSubline(text)}
            onApplyCta={(text) => setCtaText(text)}
            onApplyTag={(text) => setTag(text)}
            brandColors={{
              primaryColor: brand.primaryColor,
              secondaryColor: brand.secondaryColor,
              backgroundColor: brand.backgroundColor,
            }}
            initialArtDirection={artDirection}
            initialVisualCategory={visualCategory}
            initialArtBriefing={artBriefing}
            personImage={personImage}
            onChangeArtDirection={(d) => setArtDirection(d)}
            onChangeVisualCategory={(id) => setVisualCategory(id)}
            onChangeArtBriefing={(b) => setArtBriefing(b)}
          />

          {/* SEÇÃO 4: PESSOA REAL */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User size={16} className="text-brand-400" /> Pessoa Real no Criativo
              </h3>
              {personImage && (
                <button
                  onClick={() => setPersonImage(null)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>

            <input
              ref={personFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadPerson}
              className="hidden"
            />

            {!personImage ? (
              <div
                onClick={() => personFileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-white/15 hover:border-brand-500/50 rounded-2xl p-4 flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.04] transition-all text-center"
              >
                <div className="p-2.5 rounded-full bg-white/5 text-brand-400 mb-2">
                  <Upload size={20} />
                </div>
                <p className="text-xs font-bold text-gray-200">Adicionar Foto de Pessoa Real (PNG)</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Foto recortada ou use a aba &quot;Estúdio de Poses&quot; para criar com IA
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Controles da Pessoa */}
                <div className="grid grid-cols-3 gap-2">
                  {(['left', 'center', 'right'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => {
                        setPersonPosition(pos);
                        setPersonXY(null);
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        personPosition === pos && !personXY
                          ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}
                    >
                      {pos === 'left' && 'Esquerda'}
                      {pos === 'center' && 'Centro'}
                      {pos === 'right' && 'Direita'}
                    </button>
                  ))}
                </div>

                {/* Slider livre X (posicao horizontal) */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-1">
                    <span>Posição Horizontal (X)</span>
                    <span>{Math.round(personXY?.x ?? (personPosition === 'left' ? 0 : personPosition === 'right' ? 100 : 50))}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={personXY?.x ?? (personPosition === 'left' ? 0 : personPosition === 'right' ? 100 : 50)}
                    onChange={(e) => {
                      const x = Number(e.target.value);
                      setPersonXY((prev) => ({ x, y: prev?.y ?? 100 }));
                    }}
                    className="w-full accent-brand-500"
                  />
                </div>

                {/* Slider de Escala / Tamanho */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1">
                    <span>Tamanho da Pessoa</span>
                    <span>{personScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="140"
                    value={personScale}
                    onChange={(e) => setPersonScale(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Toggles Rápidos */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setPersonFlipped(!personFlipped)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      personFlipped
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'bg-white/5 border-white/10 text-gray-300'
                    }`}
                  >
                    <FlipHorizontal size={13} /> Espelhar
                  </button>
                  <button
                    onClick={() => setPersonGlow(!personGlow)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      personGlow
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'bg-white/5 border-white/10 text-gray-300'
                    }`}
                  >
                    <Sparkles size={13} /> Glow Marca
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 4: BACKGROUND (IA OU UPLOAD) */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" /> Cenário de Fundo (IA)
              </h3>
              {bgImage && (
                <button
                  onClick={() => setBgImage(null)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Usar Cor da Marca
                </button>
              )}
            </div>

            {/* CONTROLE DE ZOOM E POSICAO DA IMAGEM DE FUNDO */}
            {bgImage && (
              <BackgroundImageControl
                scale={bgScale}
                offsetX={bgOffsetX}
                offsetY={bgOffsetY}
                onChange={({ scale, offsetX, offsetY }) => {
                  setBgScale(scale);
                  setBgOffsetX(offsetX);
                  setBgOffsetY(offsetY);
                }}
              />
            )}

            <div className="space-y-2">
              {/* MESTRE DOS PROMPTS - Genos-style */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-purple-500/30 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Wand2 size={13} className="text-purple-400" />
                  <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Mestre dos Prompts</span>
                  <span className="text-[9px] font-mono text-purple-400 ml-auto">powered by ChatGPT</span>
                </div>
                <textarea
                  rows={2}
                  value={masterPromptInput}
                  onChange={(e) => setMasterPromptInput(e.target.value)}
                  placeholder="Brief curto: ex: 'smartphone premium em fundo escuro com luzes neon'"
                  className="w-full px-3 py-2 rounded-xl bg-black/30 border border-purple-500/20 text-white placeholder-gray-500 text-xs focus:border-purple-500 focus:outline-none resize-none"
                />
                <button
                  onClick={handleMasterPrompt}
                  disabled={isOptimizingPrompt}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/30 hover:bg-purple-500/40 text-purple-100 border border-purple-500/40 transition-all disabled:opacity-50"
                >
                  {isOptimizingPrompt ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Otimizando prompt...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} /> Transformar em prompt profissional
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={2}
                value={bgPrompt}
                onChange={(e) => setBgPrompt(e.target.value)}
                placeholder="Ex: Dark luxury modern glass office, cinematic depth of field, neon accents..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:border-brand-500 focus:outline-none resize-none"
              />

              {/* Seletor de Modelo */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Modelo de IA
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:border-brand-500 focus:outline-none"
                >
                  <option value="auto" className="bg-[#11131a]">
                    ⭐ Auto (pula do melhor para o mais barato)
                  </option>
                  <option value="gpt-image-2.5-sunburst" className="bg-[#11131a]">
                    💎 GPT Image 2.5 Sunburst (máxima qualidade)
                  </option>
                  <option value="gpt-image-2.5-flare" className="bg-[#11131a]">
                    ⚡ GPT Image 2.5 Flare (mais rápido)
                  </option>
                  <option value="gpt-image-2" className="bg-[#11131a]">
                    ✨ GPT Image 2
                  </option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  💡 <strong>Auto</strong> tenta os modelos disponíveis, do mais avançado ao mais econômico.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleGenerateBg}
                  disabled={isGeneratingBg}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all disabled:opacity-50"
                >
                  {isGeneratingBg ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Gerando com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} /> Gerar Background (OpenAI)
                    </>
                  )}
                </button>

                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadBg}
                  className="hidden"
                />
                <button
                  onClick={() => bgFileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
                  title="Enviar imagem do PC"
                >
                  <Upload size={14} />
                </button>
              </div>
              {bgError && <p className="text-[11px] text-red-400">{bgError}</p>}

              {/* VARIAÇÕES EM MASSA */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={11} className="text-blue-400" /> Variações em Massa
                  </span>
                  <select
                    value={variationsCount}
                    onChange={(e) => setVariationsCount(Number(e.target.value))}
                    className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-semibold focus:outline-none"
                  >
                    <option value={2} className="bg-[#11131a]">2 variações</option>
                    <option value={4} className="bg-[#11131a]">4 variações</option>
                    <option value={6} className="bg-[#11131a]">6 variações</option>
                    <option value={8} className="bg-[#11131a]">8 variações</option>
                  </select>
                </div>
                <button
                  onClick={handleBulkGenerate}
                  disabled={isBulkGenerating}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-all disabled:opacity-50"
                >
                  {isBulkGenerating ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Gerando {bulkVariations.length}/{variationsCount}...
                    </>
                  ) : (
                    <>
                      <Layers size={12} /> Gerar {variationsCount} Variações
                    </>
                  )}
                </button>
                {bulkVariations.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {bulkVariations.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setBgImage(img)}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-brand-500 transition-colors"
                        title={`Aplicar variação ${i + 1}`}
                      >
                        <img src={img} alt={`variação ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* REFINAMENTO ITERATIVO */}
              {bgImage && (
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw size={11} className="text-amber-400" /> Refinar esta Imagem
                  </span>
                  <input
                    type="text"
                    value={refinementInstruction}
                    onChange={(e) => setRefinementInstruction(e.target.value)}
                    placeholder="Ex: 'mude iluminação para azul neon' ou 'adicione pessoa no canto'"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:border-brand-500 focus:outline-none"
                  />
                  <button
                    onClick={handleRefine}
                    disabled={isRefining}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all disabled:opacity-50"
                  >
                    {isRefining ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Refinando...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={12} /> Refinar Imagem
                      </>
                    )}
                  </button>
                  {refinementHistory.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Histórico</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {refinementHistory.map((h, i) => (
                          <button
                            key={i}
                            onClick={() => setBgImage(h.result)}
                            className="relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-amber-500 transition-colors group"
                            title={h.instruction}
                          >
                            <img src={h.result} alt={`refinamento ${i + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                              <span className="text-[9px] text-white text-center line-clamp-3">{h.instruction}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 5: BARRA SUPERIOR 100% EDITÁVEL POR ELEMENTO */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award size={16} className="text-brand-400" /> Barra Superior (Topo do Criativo)
              </h3>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTopBar}
                  onChange={(e) => setShowTopBar(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-[11px] text-gray-300 font-semibold">Mostrar Topo</span>
              </label>
            </div>

            {/* Toggles individuais para cada elemento do topo */}
            <div className="grid grid-cols-3 gap-2">
              <label className={`flex items-center gap-1.5 py-1.5 px-2 rounded-xl border cursor-pointer transition-all ${showTag ? 'bg-brand-500/20 border-brand-500 text-brand-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                <input
                  type="checkbox"
                  checked={showTag}
                  onChange={(e) => setShowTag(e.target.checked)}
                  className="w-3 h-3 accent-emerald-500"
                />
                <span className="text-[11px] font-bold">Tag</span>
              </label>

              <label className={`flex items-center gap-1.5 py-1.5 px-2 rounded-xl border cursor-pointer transition-all ${showHandle ? 'bg-brand-500/20 border-brand-500 text-brand-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                <input
                  type="checkbox"
                  checked={showHandle}
                  onChange={(e) => setShowHandle(e.target.checked)}
                  className="w-3 h-3 accent-emerald-500"
                />
                <span className="text-[11px] font-bold">@ Handle</span>
              </label>

              <label className={`flex items-center gap-1.5 py-1.5 px-2 rounded-xl border cursor-pointer transition-all ${showBadge ? 'bg-brand-500/20 border-brand-500 text-brand-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                <input
                  type="checkbox"
                  checked={showBadge}
                  onChange={(e) => setShowBadge(e.target.checked)}
                  className="w-3 h-3 accent-emerald-500"
                />
                <span className="text-[11px] font-bold">Selo</span>
              </label>
            </div>

            {/* Texto Customizado para o Topo */}
            {showHandle && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Texto do Topo (sobrescreve o handle do cliente)
                </label>
                <input
                  type="text"
                  value={customTopText}
                  onChange={(e) => setCustomTopText(e.target.value)}
                  placeholder={brand.handle || brand.name}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Deixe vazio para usar o @{brand.handle || brand.name} padrão do cliente.
                </p>
              </div>
            )}

            {/* Selos Pré-definidos (só aparecem se toggle "Selo" estiver ativo) */}
            {showBadge && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
                  Selo de Autoridade
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'Sem Selo' },
                    { id: 'stars', label: '⭐ 5.0 Estrelas' },
                    { id: 'verified', label: '🛡️ 100% Verificado' },
                    { id: 'bestseller', label: '🏆 Mais Vendido' },
                  ].map((badge) => (
                    <button
                      key={badge.id}
                      onClick={() => setSelectedBadge(badge.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left ${
                        selectedBadge === badge.id
                          ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {badge.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 6: TEXTOS & TIPOGRAFIA AVANCADA */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Type size={16} className="text-brand-400" /> Textos & Tipografia
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTextAlignment(textAlignment === 'left' ? 'center' : 'left')}
                  className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded bg-white/5"
                  title="Alternar alinhamento horizontal"
                >
                  {textAlignment === 'left' ? '↔ Alinhar Centro' : '↔ Alinhar Esquerda'}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-gray-500 leading-relaxed">
              💡 Clique em <strong>▼ (chevron)</strong> ao lado de cada texto para abrir o painel completo de tipografia (fonte, tamanho, peso, cor, espaçamento, sombra e caixa de destaque).
            </p>

            {/* TAG / CATEGORIA */}
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="MÉTODO EXCLUSIVO"
              className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
            />
            <TypographyControl
              label="Tag / Categoria"
              config={tagConfig}
              onChange={setTagConfig}
              defaultColor={brand.primaryColor}
              localFonts={localFonts}
              brandHeadlineFont={brand.fontHeadline}
              brandBodyFont={brand.fontBody}
            />

            {/* HEADLINE */}
            <textarea
              rows={2}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="COMO DOBRAR SUAS CONVERSÕES NO META ADS"
              className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:border-brand-500 focus:outline-none resize-none"
            />
            <TypographyControl
              label="Headline Principal"
              config={headlineConfig}
              onChange={setHeadlineConfig}
              defaultColor={brand.textColor}
              localFonts={localFonts}
              brandHeadlineFont={brand.fontHeadline}
              brandBodyFont={brand.fontBody}
            />

            {/* FRASE DE DESTAQUE */}
            <textarea
              rows={2}
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              placeholder="Sem gastar mais em tráfego"
              className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold focus:border-brand-500 focus:outline-none resize-none"
              style={{ color: brand.primaryColor }}
            />
            <TypographyControl
              label="Frase de Destaque"
              config={highlightConfig}
              onChange={setHighlightConfig}
              defaultColor={brand.primaryColor}
              localFonts={localFonts}
              brandHeadlineFont={brand.fontHeadline}
              brandBodyFont={brand.fontBody}
            />

            {/* SUBTITULO */}
            <input
              type="text"
              value={subline}
              onChange={(e) => setSubline(e.target.value)}
              placeholder="Aprenda o passo a passo validado por especialistas."
              className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs focus:border-brand-500 focus:outline-none"
            />
            <TypographyControl
              label="Subtítulo"
              config={sublineConfig}
              onChange={setSublineConfig}
              defaultColor={brand.accentTextColor}
              localFonts={localFonts}
              brandHeadlineFont={brand.fontHeadline}
              brandBodyFont={brand.fontBody}
            />

            {/* CTA */}
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="QUERO APRENDER AGORA"
                className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
                disabled={!showCta}
              />
              <label className="inline-flex items-center gap-1.5 px-2 cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={showCta}
                  onChange={(e) => setShowCta(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-500"
                />
                <span className="text-[10px] text-gray-400 font-bold">CTA</span>
              </label>
            </div>
            {showCta && (
              <TypographyControl
                label="Botão de Ação (CTA)"
                config={ctaConfig}
                onChange={setCtaConfig}
                defaultColor={brand.backgroundColor}
                localFonts={localFonts}
                brandHeadlineFont={brand.fontHeadline}
                brandBodyFont={brand.fontBody}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
