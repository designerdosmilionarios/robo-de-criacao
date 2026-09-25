import type { Layer, Psd } from 'ag-psd';
import saveAs from 'file-saver';

export interface PsdRasterLayer {
  name: string;
  canvas: HTMLCanvasElement;
  hidden?: boolean;
}

export interface PsdNativeTextLayer {
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  uppercase: boolean;
  underline: boolean;
}

export async function dataUrlToCanvas(
  dataUrl: string,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Não foi possível preparar a imagem para o PSD.'));
    element.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('O navegador não conseguiu criar o arquivo PSD.');
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function exportExactPsd(
  finalCanvas: HTMLCanvasElement,
  fileName: string
): Promise<void> {
  const layer: Layer = {
    name: 'COMPOSIÇÃO FINAL — EXATA',
    canvas: finalCanvas,
  };
  await writeAndDownloadPsd(
    {
      width: finalCanvas.width,
      height: finalCanvas.height,
      canvas: finalCanvas,
      children: [layer],
    },
    fileName
  );
}

export async function exportEditablePsd(options: {
  finalCanvas: HTMLCanvasElement;
  layers: PsdRasterLayer[];
  nativeTextLayers: PsdNativeTextLayer[];
  fileName: string;
}): Promise<void> {
  const { finalCanvas, layers, nativeTextLayers, fileName } = options;
  const textChildren = nativeTextLayers.map(createNativeTextLayer);
  const children: Layer[] = [
    ...(textChildren.length > 0
      ? [{
          name: 'TEXTOS NATIVOS — ATIVE PARA EDITAR O CONTEÚDO',
          hidden: true,
          opened: true,
          children: textChildren,
        } as Layer]
      : []),
    ...layers.map((layer) => ({
      name: layer.name,
      canvas: layer.canvas,
      hidden: layer.hidden,
    })),
    {
      name: 'REFERÊNCIA EXATA — OCULTA',
      canvas: finalCanvas,
      hidden: true,
    },
  ];

  await writeAndDownloadPsd(
    {
      width: finalCanvas.width,
      height: finalCanvas.height,
      canvas: finalCanvas,
      children,
    },
    fileName
  );
}

function createNativeTextLayer(spec: PsdNativeTextLayer): Layer {
  const rgb = parseHexColor(spec.color);
  const content = spec.uppercase ? spec.text.toUpperCase() : spec.text;
  return {
    name: spec.name,
    hidden: false,
    text: {
      text: content,
      transform: [1, 0, 0, 1, spec.x, spec.y],
      shapeType: 'box',
      boxBounds: [0, 0, Math.max(1, spec.width), Math.max(1, spec.height)],
      style: {
        font: { name: spec.fontFamily || 'ArialMT' },
        fontSize: spec.fontSize,
        fauxBold: Number(spec.fontWeight) >= 700,
        leading: spec.fontSize * spec.lineHeight,
        tracking: spec.letterSpacing,
        underline: spec.underline,
        fillColor: { r: rgb.r, g: rgb.g, b: rgb.b },
      },
      paragraphStyle: {
        justification: spec.textAlign,
      },
    },
  };
}

async function writeAndDownloadPsd(psd: Psd, fileName: string): Promise<void> {
  const { readPsd, writePsd } = await import('ag-psd');
  const buffer = writePsd(psd, {
    generateThumbnail: false,
    noBackground: true,
  });

  const parsed = readPsd(buffer, {
    skipLayerImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });
  if (parsed.width !== psd.width || parsed.height !== psd.height || !parsed.children?.length) {
    throw new Error('O PSD gerado não passou na validação de integridade.');
  }

  const safeName = sanitizeFileName(fileName);
  saveAs(new Blob([buffer], { type: 'image/vnd.adobe.photoshop' }), `${safeName}.psd`);
}

function parseHexColor(value: string): { r: number; g: number; b: number } {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return { r: 255, g: 255, b: 255 };
  const hex = match[1].length === 3
    ? match[1].split('').map((char) => char + char).join('')
    : match[1];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function sanitizeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'criativo';
}
