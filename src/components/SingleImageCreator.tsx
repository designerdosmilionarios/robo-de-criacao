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
  Palette,
  CheckCircle2,
  Shield,
  Award,
  Star,
  Eye,
  Trash2,
  Image as ImgIcon,
  Save,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import saveAs from 'file-saver';

interface SingleImageCreatorProps {
  brand: BrandKit;
  apiKey: string;
  provider: 'openai' | 'Opus 4.8';
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
  provider,
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

  // Formato do Canvas
  const [format, setFormat] = useState<'4:5' | '1:1' | '9:16' | '16:9'>('4:5');

  // Background (IA ou Upload)
  const [bgPrompt, setBgPrompt] = useState('');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);

  // Imagem de Referência para a IA guiar o estilo
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // Logo da Marca
  const [logoImage, setLogoImage] = useState<string | null>(brand.logoUrl || null);
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-left');
  const [logoScale, setLogoScale] = useState<number>(100);

  // Imagem de Pessoa Real
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [personPosition, setPersonPosition] = useState<'right' | 'left' | 'center'>('right');
  const [personScale, setPersonScale] = useState<number>(100); // 50% a 150%
  const [personBottomOffset, setPersonBottomOffset] = useState<number>(0);
  const [personFlipped, setPersonFlipped] = useState(false);
  const [personShadow, setPersonShadow] = useState(true);
  const [personGlow, setPersonGlow] = useState(false);
  const [personBottomFade, setPersonBottomFade] = useState(true);

  // Selo de Autoridade / Badge
  const [selectedBadge, setSelectedBadge] = useState<string | null>('none');

  // Controles de visibilidade do topo (cada cliente decide)
  const [showTopBar, setShowTopBar] = useState(true);
  const [showTag, setShowTag] = useState(true);
  const [showHandle, setShowHandle] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [customTopText, setCustomTopText] = useState('');

  // Configuração da marca - usar handle real ou nome padrão
  useEffect(() => {
    if (brand.handle && !showHandle) setCustomTopText('');
  }, [brand.handle, showHandle]);

  // Camadas de Texto
  const [showText, setShowText] = useState(true);
  const [tag, setTag] = useState('MÉTODO EXCLUSIVO');
  const [headline, setHeadline] = useState('COMO DOBRAR SUAS CONVERSÕES NO META ADS');
  const [highlightText, setHighlightText] = useState('Sem gastar mais em tráfego');
  const [subline, setSubline] = useState('Aprenda o passo a passo validado por especialistas.');
  const [ctaText, setCtaText] = useState('QUERO APRENDER AGORA');
  const [showCta, setShowCta] = useState(true);
  const [headlineFont, setHeadlineFont] = useState(brand.fontHeadline);
  const [textAlignment, setTextAlignment] = useState<'left' | 'center'>('left');

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
      },
      load: (data: any) => {
        if (data.format) setFormat(data.format);
        if ('bgPrompt' in data) setBgPrompt(data.bgPrompt);
        if ('bgImage' in data) setBgImage(data.bgImage);
        if ('referenceImage' in data) setReferenceImage(data.referenceImage);
        if ('logoImage' in data) setLogoImage(data.logoImage);
        if (data.logoPosition) setLogoPosition(data.logoPosition);
        if (typeof data.logoScale === 'number') setLogoScale(data.logoScale);
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
    if (!bgPrompt && !referenceImage) {
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

      const requestBody: any = {
        prompt: bgPrompt || 'premium dark cinematic background for advertising',
        size: sizeMap[format],
        aspectRatio: format, // passa o aspect ratio desejado (1:1, 4:5, 9:16, 16:9)
        provider: provider === 'Opus 4.8' ? 'Opus 4.8' : 'openai',
        apiKey,
      };

      if (referenceImage) {
        requestBody.imageBase64 = referenceImage.replace(/^data:image\/\w+;base64,/, '');
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
    } catch (err: any) {
      setBgError(err.message || 'Erro ao comunicar com a IA.');
    } finally {
      setIsGeneratingBg(false);
    }
  };

  // Download do Criativo Final em alta resolução
  const handleDownloadCanvas = async () => {
    const el = document.getElementById('single-creative-canvas');
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true });
      saveAs(
        dataUrl,
        `${brand.name.toLowerCase().replace(/\s+/g, '-')}-criativo-${format.replace(':', 'x')}.png`
      );
    } catch (e) {
      console.error('Erro ao baixar canvas:', e);
    }
  };

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUNA ESQUERDA: CANVAS PREVIEW (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[540px]">
            {/* O CANVAS RENDERIZADO */}
            <div
              id="single-creative-canvas"
              className={`relative w-full ${currentFormat.className} overflow-hidden rounded-2xl shadow-2xl border border-white/15 select-none`}
              style={{
                backgroundColor: brand.backgroundColor,
                color: brand.textColor,
                fontFamily: brand.fontBody,
              }}
            >
              {/* CAMADA 1: BACKGROUND (IMAGEM OU GRADIENTE) */}
              {bgImage ? (
                <img
                  src={bgImage}
                  alt="Background"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 50% 20%, ${brand.cardColor} 0%, ${brand.backgroundColor} 100%)`,
                  }}
                />
              )}

              {/* CAMADA 2: OVERLAY GRADIENTE PARA CONTRASTE */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    textAlignment === 'left' && personPosition === 'right'
                      ? `linear-gradient(to right, ${brand.backgroundColor}f2 0%, ${brand.backgroundColor}aa 45%, transparent 100%)`
                      : `linear-gradient(to top, ${brand.backgroundColor}f2 0%, ${brand.backgroundColor}66 50%, transparent 100%)`,
                }}
              />

              {/* CAMADA 3: GLOWS DA MARCA */}
              <div
                className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-[100px] opacity-35 pointer-events-none"
                style={{ backgroundColor: brand.primaryColor }}
              />
              <div
                className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none"
                style={{ backgroundColor: brand.secondaryColor }}
              />

              {/* CAMADA 4: LOGO DO CLIENTE / MARCA */}
              {logoImage && (
                <div
                  className={`absolute z-30 pointer-events-none p-6 sm:p-8 ${
                    logoPosition === 'top-left'
                      ? 'top-0 left-0'
                      : logoPosition === 'top-right'
                      ? 'top-0 right-0'
                      : logoPosition === 'bottom-left'
                      ? 'bottom-0 left-0'
                      : 'bottom-0 right-0'
                  }`}
                >
                  <img
                    src={logoImage}
                    alt="Logo"
                    className="object-contain filter drop-shadow-md"
                    style={{
                      height: `${(logoScale / 100) * 42}px`,
                      maxWidth: '160px',
                    }}
                  />
                </div>
              )}

              {/* CAMADA 5: PESSOA REAL */}
              {personImage && (
                <div
                  className={`absolute pointer-events-none transition-all duration-200 z-10 ${
                    personPosition === 'right'
                      ? 'right-0'
                      : personPosition === 'left'
                      ? 'left-0'
                      : 'left-1/2 -translate-x-1/2'
                  }`}
                  style={{
                    bottom: `${personBottomOffset}px`,
                    width: `${personScale}%`,
                    maxWidth: format === '16:9' ? '55%' : '85%',
                    transform: `${personPosition === 'center' ? 'translateX(-50%)' : ''} ${
                      personFlipped ? 'scaleX(-1)' : ''
                    }`,
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

              {/* CAMADA 6: TEXTOS E ELEMENTOS DO ANÚNCIO */}
              {showText && (
                <div
                  className={`relative z-20 w-full h-full flex flex-col justify-between p-6 sm:p-10 ${
                    textAlignment === 'center' ? 'items-center text-center' : 'items-start text-left'
                  }`}
                >
                  {/* TOPO: BARRA SUPERIOR 100% EDITÁVEL POR ELEMENTO */}
                  {showTopBar && (
                    <div className={`flex items-center gap-3 flex-wrap ${logoPosition === 'top-left' && logoImage ? 'mt-8 sm:mt-10' : ''}`}>
                      {/* TAG */}
                      {showTag && tag && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
                          style={{
                            backgroundColor: `${brand.primaryColor}25`,
                            color: brand.primaryColor,
                            borderLeft: `3px solid ${brand.primaryColor}`,
                          }}
                        >
                          {tag}
                        </span>
                      )}

                      {/* HANDLE / TEXTO CUSTOMIZADO (substitui a lógica antiga) */}
                      {showHandle && (
                        <span
                          className="text-[11px] font-bold tracking-tight opacity-75"
                          style={{ color: brand.textColor }}
                        >
                          {customTopText || brand.handle || brand.name}
                        </span>
                      )}

                      {/* SELO DE AUTORIDADE / BADGE */}
                      {showBadge && selectedBadge === 'stars' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                          <Star size={11} className="fill-amber-400" /> 5.0 (Avaliação Máxima)
                        </span>
                      )}
                      {showBadge && selectedBadge === 'verified' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                          <Shield size={11} /> 100% Verificado
                        </span>
                      )}
                      {showBadge && selectedBadge === 'bestseller' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-400/20 text-purple-300 text-[10px] font-bold border border-purple-400/30">
                          <Award size={11} /> Mais Vendido
                        </span>
                      )}
                    </div>
                  )}

                  {/* MEIO/BASE: HEADLINE + DESTAQUE + SUBLINE + CTA */}
                  <div
                    className={`space-y-3.5 ${
                      personPosition === 'right' && textAlignment === 'left' ? 'max-w-[62%]' : 'max-w-full'
                    }`}
                  >
                    {/* Headline Principal */}
                    <h1
                      className={`font-extrabold tracking-tight leading-[1.08] ${
                        format === '16:9'
                          ? 'text-3xl sm:text-4xl'
                          : format === '9:16'
                          ? 'text-3xl sm:text-4xl'
                          : 'text-2xl sm:text-3xl'
                      }`}
                      style={{
                        fontFamily: headlineFont,
                        color: brand.textColor,
                      }}
                    >
                      {headline}
                    </h1>

                    {/* Frase de Destaque */}
                    {highlightText && (
                      <p
                        className={`font-black tracking-tight leading-tight ${
                          format === '16:9' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
                        }`}
                        style={{ color: brand.primaryColor }}
                      >
                        {highlightText}
                      </p>
                    )}

                    {/* Subline */}
                    {subline && (
                      <p
                        className="text-xs sm:text-sm font-medium leading-relaxed opacity-85"
                        style={{ color: brand.accentTextColor }}
                      >
                        {subline}
                      </p>
                    )}

                    {/* Botão de Chamada para Ação (CTA) */}
                    {showCta && ctaText && (
                      <div className="pt-2">
                        <span
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-xl transition-all"
                          style={{
                            backgroundColor: brand.primaryColor,
                            color: brand.backgroundColor,
                            boxShadow: `0 10px 25px -5px ${brand.primaryColor}50`,
                          }}
                        >
                          <MousePointerClick size={14} />
                          {ctaText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* BOTÕES DE AÇÃO: SALVAR + BAIXAR */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {onSaveRequest && (
                <button
                  onClick={onSaveRequest}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                >
                  <Save size={16} /> Salvar Projeto
                </button>
              )}
              <button
                onClick={handleDownloadCanvas}
                className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-brand-500 to-emerald-400 text-dark-900 hover:opacity-95 transition-all shadow-lg ${
                  onSaveRequest ? '' : 'col-span-2'
                }`}
              >
                <Download size={16} /> Baixar ({currentFormat.label})
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: PAINEL DE EDIÇÃO (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
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
                <div className="flex items-center justify-between bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <img src={logoImage} alt="logo preview" className="h-8 max-w-[90px] object-contain bg-white/5 rounded p-1" />
                    <span className="text-xs text-gray-300 font-medium truncate max-w-[120px]">Logo ativa</span>
                  </div>
                  <button
                    onClick={() => logoFileInputRef.current?.click()}
                    className="text-xs text-brand-400 hover:underline font-semibold"
                  >
                    Trocar
                  </button>
                </div>

                {/* Posição do Logo */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Posição no Criativo</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'top-left', label: 'Superior Esquerdo' },
                      { id: 'top-right', label: 'Superior Direito' },
                      { id: 'bottom-left', label: 'Inferior Esquerdo' },
                      { id: 'bottom-right', label: 'Inferior Direito' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        onClick={() => setLogoPosition(pos.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                          logoPosition === pos.id
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tamanho do Logo */}
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

          {/* SEÇÃO 3: PESSOA REAL */}
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
                      onClick={() => setPersonPosition(pos)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        personPosition === pos
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

            <div className="space-y-2">
              <textarea
                rows={2}
                value={bgPrompt}
                onChange={(e) => setBgPrompt(e.target.value)}
                placeholder="Ex: Dark luxury modern glass office, cinematic depth of field, neon accents..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:border-brand-500 focus:outline-none resize-none"
              />
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
                      <Sparkles size={13} /> Gerar Background ({provider === 'Opus 4.8' ? 'Opus 4.8' : 'OpenAI'})
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

          {/* SEÇÃO 6: TEXTOS E TIPOGRAFIA */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wand2 size={16} className="text-brand-400" /> Textos & Copy
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTextAlignment(textAlignment === 'left' ? 'center' : 'left')}
                  className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded bg-white/5"
                >
                  {textAlignment === 'left' ? 'Alinhar Centro' : 'Alinhar Esquerda'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Seleção de Fonte da Headline */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Fonte da Headline (do seu PC ou Marca)
                </label>
                <select
                  value={headlineFont}
                  onChange={(e) => setHeadlineFont(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:border-brand-500 focus:outline-none"
                >
                  <option value={brand.fontHeadline} className="bg-[#11131a]">
                    {brand.fontHeadline} (Padrão do Cliente)
                  </option>
                  {localFonts.map((f) => (
                    <option key={f.family} value={f.family} className="bg-[#11131a]">
                      🔤 {f.family} (Fonte do seu PC)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag Superior */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Tag / Categoria</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Headline */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Headline Principal</label>
                <textarea
                  rows={2}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              {/* Destaque */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Frase de Destaque (Cor)</label>
                <textarea
                  rows={2}
                  value={highlightText}
                  onChange={(e) => setHighlightText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-brand-400 text-xs font-semibold focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              {/* Subline */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={subline}
                  onChange={(e) => setSubline(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Botão CTA */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-gray-400">Botão de Ação (CTA)</label>
                  <input
                    type="checkbox"
                    checked={showCta}
                    onChange={(e) => setShowCta(e.target.checked)}
                    className="accent-emerald-500"
                  />
                </div>
                {showCta && (
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
