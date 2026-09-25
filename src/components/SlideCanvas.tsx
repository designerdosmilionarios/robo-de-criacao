import React from 'react';
import { BrandKit, CarouselSlide, TemplateStyle } from '@/types';
import { Sparkles, ArrowRight, CheckCircle2, Bookmark, Flame } from 'lucide-react';

interface SlideCanvasProps {
  slide: CarouselSlide;
  brand: BrandKit;
  index: number;
  totalSlides: number;
  aspectRatio: '4:5' | '1:1' | '9:16';
  templateStyle: TemplateStyle;
  id?: string;
}

// Helper para gerar style de posição absoluta baseada em coordenadas X/Y (%)
function posStyle(pos?: { x: number; y: number }) {
  if (!pos) return undefined;
  return {
    position: 'absolute' as const,
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '500px',
  };
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  brand,
  index,
  totalSlides,
  aspectRatio,
  templateStyle,
  id,
}) => {
  const aspectClass =
    aspectRatio === '4:5'
      ? 'aspect-[4/5] min-h-[500px]'
      : aspectRatio === '1:1'
      ? 'aspect-square min-h-[440px]'
      : 'aspect-[9/16] min-h-[620px]';

  return (
    <div
      id={id}
      className={`relative w-full ${aspectClass} overflow-hidden rounded-2xl select-none flex flex-col justify-between p-7 sm:p-8 transition-all duration-300 shadow-2xl`}
      style={{
        backgroundColor: brand.backgroundColor,
        color: brand.textColor,
        fontFamily: brand.fontBody,
      }}
    >
      {/* Imagem de Fundo / Asset Gerado por IA */}
      {slide.imageUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={slide.imageUrl}
            alt="Asset de IA"
            className="w-full h-full object-cover opacity-35 mix-blend-screen scale-105"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${brand.backgroundColor}cc 0%, ${brand.backgroundColor}88 50%, ${brand.backgroundColor}ee 100%)`,
            }}
          />
        </div>
      )}

      {/* Background Decorativo por Estilo */}
      {templateStyle === 'tech-modern' && (
        <>
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[100px] opacity-25 pointer-events-none"
            style={{ backgroundColor: brand.primaryColor }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-[110px] opacity-20 pointer-events-none"
            style={{ backgroundColor: brand.secondaryColor }}
          />
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
        </>
      )}

      {templateStyle === 'glassmorphism' && (
        <>
          <div
            className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-30 pointer-events-none"
            style={{ backgroundColor: brand.primaryColor }}
          />
          <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[2px] pointer-events-none" />
        </>
      )}

      {templateStyle === 'neo-brutalist' && (
        <div
          className="absolute inset-2 border-2 pointer-events-none opacity-40 rounded-xl"
          style={{ borderColor: brand.primaryColor }}
        />
      )}

      {/* HEADER DO SLIDE */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-md"
            style={{
              backgroundColor: brand.primaryColor,
              color: brand.backgroundColor,
            }}
          >
            {brand.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold leading-tight tracking-tight">
              {brand.name}
            </p>
            <p className="text-[11px] opacity-60 leading-tight">
              {brand.handle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {slide.type === 'cover' && (
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border shadow-sm"
              style={{
                borderColor: `${brand.primaryColor}55`,
                backgroundColor: `${brand.primaryColor}15`,
                color: brand.primaryColor,
              }}
            >
              <Flame size={12} /> {slide.topBadge || 'Post Novo'}
            </span>
          )}
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10"
            style={{ color: brand.textColor }}
          >
            {String(index + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* CORPO CENTRAL DO SLIDE - com posicionamento livre opcional */}
      <div className="relative z-10 my-auto py-4 flex flex-col justify-center w-full">
        {/* Tag Superior - com posicao livre opcional */}
        {slide.tag && (
          <div
            style={posStyle(slide.tagPos)}
            className={slide.tagPos ? '' : 'mb-3.5'}
          >
            {!slide.tagPos && (
              <span
                className="inline-block text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-md"
                style={{
                  backgroundColor: `${brand.primaryColor}20`,
                  color: brand.primaryColor,
                  borderLeft: `3px solid ${brand.primaryColor}`,
                }}
              >
                {slide.tag}
              </span>
            )}
            {slide.tagPos && (
              <span
                className="inline-block text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-md"
                style={{
                  backgroundColor: `${brand.primaryColor}20`,
                  color: brand.primaryColor,
                  borderLeft: `3px solid ${brand.primaryColor}`,
                }}
              >
                {slide.tag}
              </span>
            )}
          </div>
        )}

        {/* Título Principal - com posicao livre opcional */}
        <h2
          className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-[1.2] mb-3 ${
            slide.titlePos ? '' : ''
          }`}
          style={{
            ...(slide.titlePos ? posStyle(slide.titlePos) : {}),
            fontFamily: brand.fontHeadline,
            color: brand.textColor,
          }}
        >
          {slide.title}
        </h2>

        {/* Texto de Destaque */}
        {slide.highlightText && (
          <p
            className="text-xl sm:text-2xl font-bold leading-snug mb-4"
            style={{
              ...(slide.highlightPos ? posStyle(slide.highlightPos) : {}),
              color: brand.primaryColor,
            }}
          >
            {slide.highlightText}
          </p>
        )}

        {/* Subtítulo */}
        {slide.subtitle && (
          <p
            className="text-sm sm:text-base leading-relaxed font-normal opacity-90 max-w-xl"
            style={{
              ...(slide.subtitlePos ? posStyle(slide.subtitlePos) : {}),
              color: brand.accentTextColor,
            }}
          >
            {slide.subtitle}
          </p>
        )}

        {/* Lista de Pontos / Checklist */}
        {slide.bodyList && slide.bodyList.length > 0 && (
          <div
            className="mt-4 space-y-2.5"
            style={posStyle(slide.bodyListPos)}
          >
            {slide.bodyList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm"
              >
                <CheckCircle2
                  size={18}
                  className="shrink-0 mt-0.5"
                  style={{ color: brand.primaryColor }}
                />
                <span className="text-xs sm:text-sm leading-relaxed" style={{ color: brand.textColor }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Botão de Chamada para Ação */}
        {slide.ctaButton && (
          <div className="mt-6" style={posStyle(slide.ctaPos)}>
            <div
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all"
              style={{
                backgroundColor: brand.primaryColor,
                color: brand.backgroundColor,
              }}
            >
              <span>{slide.ctaButton}</span>
              <ArrowRight size={16} />
            </div>
          </div>
        )}
      </div>

      {/* FOOTER DO SLIDE - agora 100% personalizável */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs opacity-75">
        <div className="flex items-center gap-2">
          {slide.bottomLeft ? (
            <span className="font-semibold text-[11px] tracking-wide" style={{ color: brand.primaryColor }}>
              {slide.bottomLeft}
            </span>
          ) : slide.badge ? (
            <span className="font-semibold text-[11px] tracking-wide" style={{ color: brand.primaryColor }}>
              {slide.badge}
            </span>
          ) : (
            <span className="text-[11px]">Arraste para o lado ➔</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {slide.bottomRight && (
            <div className="flex items-center gap-1 text-[11px]">
              <Bookmark size={13} style={{ color: brand.primaryColor }} />
              <span>{slide.bottomRight}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
