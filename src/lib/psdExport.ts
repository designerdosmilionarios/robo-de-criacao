import type { Layer, Psd } from 'ag-psd';
import saveAs from 'file-saver';
import { SRGB_IEC61966_2_1_BASE64 } from './srgbProfile';

export interface PsdRasterLayer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  hidden?: boolean;
}

export interface PsdNativeTextLayer {
  id: string;
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
  const rasterById = new Map(layers.map((layer) => [layer.id, layer]));
  const nativeTextIds = new Set(nativeTextLayers.map((layer) => layer.id));
  const textChildren = nativeTextLayers.map((layer) =>
    createNativeTextLayer(layer, rasterById.get(layer.id)?.canvas)
  );
  const fallbackTextLayers = layers
    .filter((layer) => nativeTextIds.has(layer.id))
    .map((layer) => ({
      name: `${layer.name} — backup raster`,
      canvas: layer.canvas,
      hidden: true,
    } as Layer));
  const children: Layer[] = [
    ...(textChildren.length > 0
      ? [{
          name: 'TEXTOS VISÍVEIS E EDITÁVEIS',
          opened: true,
          children: textChildren,
        } as Layer]
      : []),
    ...layers.filter((layer) => !nativeTextIds.has(layer.id)).map((layer) => ({
      name: layer.name,
      canvas: layer.canvas,
      hidden: layer.hidden,
    })),
    ...(fallbackTextLayers.length > 0
      ? [{
          name: 'BACKUP DOS TEXTOS — OCULTO',
          hidden: true,
          opened: false,
          children: fallbackTextLayers,
        } as Layer]
      : []),
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

function createNativeTextLayer(
  spec: PsdNativeTextLayer,
  previewCanvas?: HTMLCanvasElement
): Layer {
  const rgb = parseHexColor(spec.color);
  const content = spec.uppercase ? spec.text.toUpperCase() : spec.text;
  return {
    name: spec.name,
    hidden: false,
    canvas: previewCanvas,
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
  const rawBuffer = writePsd(psd, {
    generateThumbnail: false,
    noBackground: true,
  });
  const buffer = embedSrgbProfile(rawBuffer);

  const parsed = readPsd(buffer, {
    skipLayerImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });
  if (parsed.width !== psd.width || parsed.height !== psd.height || !parsed.children?.length) {
    throw new Error('O PSD gerado não passou na validação de integridade.');
  }
  if (!hasImageResource(buffer, 1039)) {
    throw new Error('O PSD gerado não recebeu o perfil de cor sRGB.');
  }

  const safeName = sanitizeFileName(fileName);
  saveAs(new Blob([buffer], { type: 'image/vnd.adobe.photoshop' }), `${safeName}.psd`);
}

/**
 * O canvas do navegador usa sRGB. Um PSD sem perfil incorporado pode assumir o
 * espaço RGB de trabalho do Photoshop e aparentar cores diferentes, apesar de
 * os bytes dos pixels serem idênticos. O recurso 1039 do formato PSD guarda o
 * perfil ICC incorporado.
 */
function embedSrgbProfile(buffer: ArrayBuffer): ArrayBuffer {
  const source = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const colorModeLength = view.getUint32(26, false);
  const resourcesLengthOffset = 30 + colorModeLength;
  const resourcesLength = view.getUint32(resourcesLengthOffset, false);
  const resourcesStart = resourcesLengthOffset + 4;
  const resourcesEnd = resourcesStart + resourcesLength;
  const profile = decodeBase64(SRGB_IEC61966_2_1_BASE64);
  const paddedProfileLength = profile.length + (profile.length % 2);
  const resource = new Uint8Array(12 + paddedProfileLength);
  resource.set([0x38, 0x42, 0x49, 0x4d], 0); // 8BIM
  resource[4] = 0x04;
  resource[5] = 0x0f; // 1039: ICC Profile
  // Bytes 6 e 7 formam um nome Pascal vazio e seu padding.
  new DataView(resource.buffer).setUint32(8, profile.length, false);
  resource.set(profile, 12);

  const result = new Uint8Array(source.length + resource.length);
  result.set(source.subarray(0, resourcesEnd), 0);
  result.set(resource, resourcesEnd);
  result.set(source.subarray(resourcesEnd), resourcesEnd + resource.length);
  new DataView(result.buffer).setUint32(
    resourcesLengthOffset,
    resourcesLength + resource.length,
    false
  );
  return result.buffer;
}

function hasImageResource(buffer: ArrayBuffer, resourceId: number): boolean {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const colorModeLength = view.getUint32(26, false);
  const resourcesLengthOffset = 30 + colorModeLength;
  const resourcesLength = view.getUint32(resourcesLengthOffset, false);
  let offset = resourcesLengthOffset + 4;
  const end = offset + resourcesLength;

  while (offset + 12 <= end) {
    if (
      bytes[offset] !== 0x38 ||
      bytes[offset + 1] !== 0x42 ||
      bytes[offset + 2] !== 0x49 ||
      bytes[offset + 3] !== 0x4d
    ) return false;
    const id = view.getUint16(offset + 4, false);
    const nameLength = bytes[offset + 6];
    const nameFieldLength = 1 + nameLength + ((1 + nameLength) % 2);
    const sizeOffset = offset + 6 + nameFieldLength;
    const dataLength = view.getUint32(sizeOffset, false);
    if (id === resourceId) return true;
    offset = sizeOffset + 4 + dataLength + (dataLength % 2);
  }
  return false;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
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
