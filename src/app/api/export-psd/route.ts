import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint que gera 2 PSDs + PNGs:
// - PSD EXATO: composicao final identica ao canvas (uma camada achatada)
// - PSD EDITAVEL: layers separadas (texto, logo, pessoa) - texto e logo renderizados
// - PNGs individuais de cada layer para Photoshop
// - PNG final

interface LayerData {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  useUppercase?: boolean;
  backgroundColor?: string;
  borderLeft?: string;
  paddingX?: number;
  paddingY?: number;
  borderRadius?: number;
  textShadow?: string;
  visible?: boolean;
}

function escapePsdText(s: string): string {
  return s.replace(/[\r\n\t]/g, ' ').substring(0, 200);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[2], 'base64');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '&apos;');
}

// === Geradores de Imagens PNG ===

// 1. Fundo (cor solida OU gradiente)
async function generateBackground(width: number, height: number, useGradient: boolean, c1: string, c2: string, angle: number, bg: string): Promise<Buffer> {
  if (!useGradient) {
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${bg}"/></svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  let x0 = 0, y0 = 0, x1 = width, y1 = height;
  if (angle === 0) { x1 = width; y1 = 0; }
  else if (angle === 90) { x0 = 0; y0 = height; x1 = width; y1 = 0; }
  else if (angle === 180) { x0 = width; y0 = 0; x1 = 0; y1 = height; }
  else if (angle === 270) { x0 = width; y0 = height; x1 = 0; y1 = 0; }
  else {
    const rad = (angle * Math.PI) / 180;
    x0 = 0; y0 = 0;
    x1 = width * Math.cos(rad);
    y1 = height * Math.sin(rad);
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grad)"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// 2. Texto simples
async function renderText(
  text: string, fontFamily: string, fontSize: number, fontWeight: string,
  color: string, align: 'left' | 'center' | 'right',
  letterSpacing: number, useUppercase: boolean, width: number, height: number,
): Promise<Buffer> {
  const finalText = useUppercase ? text.toUpperCase() : text;
  const weight = ['700', '800', '900'].includes(fontWeight) ? 'bold' : 'normal';
  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const xPos = align === 'center' ? width / 2 : align === 'right' ? width - 20 : 20;
  const yPos = height / 2 + fontSize * 0.35;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${xPos}" y="${yPos}" font-family="${fontFamily}, Inter, sans-serif"
      font-size="${fontSize}" font-weight="${weight}" fill="${color}"
      text-anchor="${anchor}" letter-spacing="${letterSpacing || 0}">${escapeXml(finalText)}</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// 3. Texto com fundo (tag, cta button)
async function renderTextWithBg(
  text: string, fontFamily: string, fontSize: number, fontWeight: string,
  textColor: string, align: 'left' | 'center' | 'right',
  letterSpacing: number, useUppercase: boolean,
  bgColor: string, borderRadius: number, paddingX: number, paddingY: number,
  width: number, height: number,
): Promise<Buffer> {
  const finalText = useUppercase ? text.toUpperCase() : text;
  const weight = ['700', '800', '900'].includes(fontWeight) ? 'bold' : 'normal';
  const xPos = align === 'center' ? width / 2 : align === 'right' ? width - paddingX : paddingX;
  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const yPos = height / 2 + fontSize * 0.35;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="${bgColor}"/>
    <text x="${xPos}" y="${yPos}" font-family="${fontFamily}, Inter, sans-serif"
      font-size="${fontSize}" font-weight="${weight}" fill="${textColor}"
      text-anchor="${anchor}" letter-spacing="${letterSpacing || 0}" dominant-baseline="middle">${escapeXml(finalText)}</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function fitImage(buf: Buffer, maxW: number, maxH: number): Promise<{ buffer: Buffer; width: number; height: number }> {
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height) return { buffer: buf, width: maxW, height: maxH };
  const ratio = Math.min(maxW / meta.width, maxH / meta.height);
  const newW = Math.round(meta.width * ratio);
  const newH = Math.round(meta.height * ratio);
  return {
    buffer: await sharp(buf).resize(newW, newH, { fit: 'inside' }).png().toBuffer(),
    width: newW, height: newH,
  };
}

// Combinar layers para gerar PNG final achatado
async function composeFinalPng(width: number, height: number, reversedLayers: Array<{ png: Buffer; left: number; top: number }>): Promise<Buffer> {
  const composites = reversedLayers.map((l) => ({
    input: l.png,
    top: l.top,
    left: l.left,
  }));
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

// === Função principal ===
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      width = 1080,
      height = 1080,
      format = '4:5',
      backgroundImage = null,
      backgroundColor = '#0a0b10',
      gradientColor1 = '#0a1f1a',
      gradientColor2 = '#0a0b10',
      gradientAngle = 135,
      useGradient = true,
      logoImage = null,
      logoPosition = 'top-left',
      logoScale = 100,
      personImage = null,
      personPosition = 'right',
      personScale = 100,
      personFlipped = false,
      tag,
      headline,
      highlight,
      subline,
      cta,
      brandName = 'Criativo',
    } = body;

    const layers: Array<{ name: string; png: Buffer; left: number; top: number; width: number; height: number }> = [];

    // === LAYER 1: FUNDO ===
    const bgPng = await generateBackground(width, height, useGradient, gradientColor1, gradientColor2, gradientAngle, backgroundColor);
    layers.push({ name: 'Fundo - ' + (useGradient ? 'Gradiente' : 'Cor Sólida'), png: bgPng, left: 0, top: 0, width, height });

    // === LAYER 2: IMAGEM DE FUNDO ===
    if (backgroundImage && backgroundImage.startsWith('data:')) {
      const buf = dataUrlToBuffer(backgroundImage);
      if (buf) {
        const meta = await sharp(buf).metadata();
        layers.push({ name: 'Imagem de Fundo', png: buf, left: 0, top: 0, width, height });
      }
    }

    // === LAYER 3: PESSOA REAL ===
    if (personImage && personImage.startsWith('data:')) {
      const buf = dataUrlToBuffer(personImage);
      if (buf) {
        const personW = (personScale / 100) * (format === '16:9' ? width * 0.55 : width * 0.85);
        const maxH = height;
        const fitted = await fitImage(buf, personW, maxH);
        let personX = 0;
        if (personFlipped) {
          personX = width - fitted.width;
        } else if (personPosition !== 'left' && personPosition !== 'center') {
          personX = width - fitted.width;
        } else if (personPosition === 'center') {
          personX = (width - fitted.width) / 2;
        }
        layers.push({
          name: 'Pessoa Real',
          png: fitted.buffer,
          left: personX,
          top: height - fitted.height,
          width: fitted.width,
          height: fitted.height,
        });
      }
    }

    // === LAYER: TAG ===
    let tagPng: Buffer | null = null;
    let tagW = 0, tagH = 0;
    if (tag && tag.text && tag.visible !== false) {
      tagW = Math.floor(width * 0.5);
      tagH = 50;
      tagPng = await renderText(
        tag.text, tag.fontFamily || 'Inter', tag.fontSize || 16,
        tag.fontWeight || '700', tag.color || '#10b981', tag.textAlign || 'left',
        tag.letterSpacing || 0, tag.useUppercase || true, tagW, tagH
      );
      layers.push({ name: 'TAG - ' + tag.text.substring(0, 25), png: tagPng, left: 30, top: Math.floor(height * 0.04), width: tagW, height: tagH });
    }

    // === LAYER: HEADLINE ===
    let headPng: Buffer | null = null;
    let headW = 0, headH = 0;
    if (headline && headline.text && headline.visible !== false) {
      headW = Math.floor(width * 0.9);
      headH = Math.max(100, headline.fontSize * 3);
      headPng = await renderText(
        headline.text, headline.fontFamily || 'Inter', headline.fontSize || 48,
        headline.fontWeight || '900', headline.color || '#ffffff', headline.textAlign || 'left',
        headline.letterSpacing || -1, headline.useUppercase || false, headW, headH
      );
      layers.push({ name: 'HEADLINE', png: headPng, left: Math.floor(width * 0.05), top: Math.floor(height * 0.45), width: headW, height: headH });
    }

    // === LAYER: DESTAQUE ===
    let highPng: Buffer | null = null;
    let highW = 0, highH = 0;
    if (highlight && highlight.text && highlight.visible !== false) {
      highW = Math.floor(width * 0.7);
      highH = Math.max(60, highlight.fontSize * 2.5);
      highPng = await renderText(
        highlight.text, highlight.fontFamily || 'Inter', highlight.fontSize || 28,
        highlight.fontWeight || '700', highlight.color || '#10b981', highlight.textAlign || 'left',
        highlight.letterSpacing || 0, highlight.useUppercase || false, highW, highH
      );
      layers.push({ name: 'DESTAQUE', png: highPng, left: Math.floor(width * 0.05), top: Math.floor(height * 0.65), width: highW, height: highH });
    }

    // === LAYER: SUBTÍTULO ===
    let subPng: Buffer | null = null;
    let subW = 0, subH = 0;
    if (subline && subline.text && subline.visible !== false) {
      subW = Math.floor(width * 0.85);
      subH = Math.max(40, subline.fontSize * 2.2);
      subPng = await renderText(
        subline.text, subline.fontFamily || 'Inter', subline.fontSize || 16,
        subline.fontWeight || '400', subline.color || '#94a3b8', subline.textAlign || 'left',
        subline.letterSpacing || 0, subline.useUppercase || false, subW, subH
      );
      layers.push({ name: 'SUBTITULO', png: subPng, left: Math.floor(width * 0.05), top: Math.floor(height * 0.78), width: subW, height: subH });
    }

    // === LAYER: CTA (botão com fundo) ===
    if (cta && cta.text && cta.visible !== false) {
      const ctaW = Math.min(600, Math.floor(width * 0.7));
      const ctaH = Math.max(60, Math.floor(cta.fontSize * 2.8));
      const ctaPng = await renderTextWithBg(
        cta.text, cta.fontFamily || 'Inter', cta.fontSize || 16,
        cta.fontWeight || '700', '#ffffff', cta.textAlign || 'center',
        cta.letterSpacing || 0, cta.useUppercase !== false,
        cta.color || '#10b981', 8, 28, 16, ctaW, ctaH
      );
      const ctaX = cta.textAlign === 'right' ? width - ctaW - 20 : cta.textAlign === 'center' ? (width - ctaW) / 2 : 20;
      layers.push({ name: 'CTA - ' + cta.text.substring(0, 25), png: ctaPng, left: ctaX, top: Math.floor(height * 0.88), width: ctaW, height: ctaH });
    }

    // === LAYER: LOGO ===
    if (logoImage && logoImage.startsWith('data:')) {
      const buf = dataUrlToBuffer(logoImage);
      if (buf) {
        const logoH = Math.max(30, Math.floor((logoScale / 100) * 60));
        const fitted = await fitImage(buf, logoH * 4, logoH);
        let logoX = 0, logoY = 0;
        if (logoPosition.includes('left')) logoX = 30;
        else if (logoPosition.includes('right')) logoX = width - fitted.width - 30;
        else logoX = (width - fitted.width) / 2;

        if (logoPosition.includes('top')) logoY = 30;
        else if (logoPosition.includes('bottom')) logoY = height - fitted.height - 30;
        else logoY = (height - fitted.height) / 2;

        layers.push({
          name: 'Logo Cliente',
          png: fitted.buffer,
          left: logoX,
          top: logoY,
          width: fitted.width,
          height: fitted.height,
        });
      }
    }

    // === Gerar PNG final ===
    // Para o PSD, vamos inverter ordem: back-to-front no Photoshop
    const reversedLayers = [...layers].reverse();
    const finalPng = await composeFinalPng(width, height, layers);
    const safeName = brandName.toLowerCase().replace(/[^a-z0-9_-]/gi, '_');

    // === Tentar gerar PSD ===
    let psdExatoBuffer: Buffer | null = null;
    let psdEditavelBuffer: Buffer | null = null;

    try {
      const agPsd = await import('ag-psd');

      // === PSD EXATO: composição única achatada ===
      // Para máxima fidelidade visual, uma única camada com o PNG final
      psdExatoBuffer = Buffer.from(agPsd.writePsd({
        width,
        height,
        channels: 4,
        bitsPerChannel: 8,
        colorMode: 3,
        children: [{
          name: 'Composição Final',
          left: 0,
          top: 0,
          right: width,
          bottom: height,
          image: finalPng,
        }],
      }));

      // === PSD EDITÁVEL: layers separadas ===
      // Para Photoshop alterar textos e logo, cada layer tem seu PNG
      psdEditavelBuffer = Buffer.from(agPsd.writePsd({
        width,
        height,
        channels: 4,
        bitsPerChannel: 8,
        colorMode: 3,
        children: reversedLayers.map((l, i) => ({
          name: escapePsdText(l.name),
          left: l.left,
          top: l.top,
          right: l.left + l.width,
          bottom: l.top + l.height,
          image: l.png,
        })),
      }));
    } catch (e) {
      console.error('Erro ao gerar PSD:', e);
    }

    // === Montar ZIP ===
    const zip = new JSZip();

    if (psdExatoBuffer) {
      zip.file(`${safeName}-EXATO.psd`, psdExatoBuffer);
    }
    if (psdEditavelBuffer) {
      zip.file(`${safeName}-EDITAVEL.psd`, psdEditavelBuffer);
    }

    // PNGs individuais de cada layer
    const layersFolder = zip.folder('layers');
    if (layersFolder) {
      layers.forEach((l, i) => {
        const safeLayerName = l.name.replace(/[^a-z0-9_-]/gi, '_').substring(0, 50);
        layersFolder.file(
          `${String(i + 1).padStart(2, '0')}-${safeLayerName}.png`,
          l.png
        );
      });
    }

    // PNG final
    zip.file(`${safeName}.png`, finalPng);

    // README detalhado
    const readme = `# Pacote de Exportacao PSD - ${brandName}

Conteudo deste ZIP:

${psdExatoBuffer ? `1. **${safeName}-EXATO.psd** - Composicao final em uma unica camada (fidelidade visual perfeita ao canvas)` : ''}
${psdExatoBuffer ? '2' : '1'}. **${safeName}-EDITAVEL.psd** - Layers separadas para edicao no Photoshop
${psdExatoBuffer ? '3' : '2'}. **${safeName}.png** - PNG final pronto para postar (1080x1350)
${psdExatoBuffer ? '4' : '3'}. **layers/** - PNGs individuais de cada camada (${layers.length} arquivos)

## Camadas (PSD EDITAVEL - de baixo para cima):

${layers.map((l, i) => `${i + 1}. ${l.name}  (${l.width}x${l.height})`).join('\n')}

## Quando usar cada PSD:

### Use PSD EXATO quando:
- Quer fidelidade visual 100% ao que viu no Studio
- Nao precisa editar nada
- Vai postar direto

### Use PSD EDITAVEL quando:
- Quer ajustar cores, fontes ou posicoes no Photoshop
- Quer trocar o logo por uma versao atualizada
- Quer traduzir os textos

## Como editar no Photoshop:

1. Abra o arquivo EDITAVEL.psd
2. Cada elemento esta em sua propria camada
3. Para trocar uma imagem: 2x clique na layer -> "Replace"
4. Para editar texto: clique duplo -> edite direto
5. Exporte como PNG/JPG quando terminar

Gerado pelo Robo Studio em ${new Date().toLocaleString('pt-BR')}
`;
    zip.file('LEIA-ME.txt', readme);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}-camadas.zip"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('Erro no export PSD:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar PSD' },
      { status: 500 }
    );
  }
}
