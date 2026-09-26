import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Play,
  Sparkles,
  Image as ImageIcon,
  Type,
  Palette,
  Target,
  Upload,
  X,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Check,
  Zap,
  Hash,
  User,
  Archive,
} from 'lucide-react';
import { optimizeImageDataUrl } from '@/lib/imageData';
import { toPng } from 'html-to-image';
import saveAs from 'file-saver';
import JSZip from 'jszip';

// Tipos de blocos disponiveis no canvas
export type BlockType =
  | 'briefing'
  | 'logo'
  | 'expert'
  | 'reference'
  | 'style'
  | 'typography'
  | 'copies'
  | 'copy-output'
  | 'image-output'
  | 'variations-output'
  | 'batch-output';

export interface FlowBlock {
  id: string;
  type: BlockType;
  label: string;
  x: number;
  y: number;
  data: any; // dados especificos do bloco
  output?: string | string[]; // texto/imagens geradas pela IA
}

export interface FlowConnection {
  id: string;
  from: string; // id do bloco origem
  to: string; // id do bloco destino
}

interface FlowCanvasProps {
  apiKey: string;
  provider: 'openai' | 'Opus 4.8';
  brand?: {
    name: string;
    primaryColor: string;
  };
}

// Configuracao visual dos tipos de bloco
const BLOCK_CONFIG: Record<BlockType, {
  icon: any;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
}> = {
  briefing: {
    icon: Type,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40 hover:border-blue-500',
    bgColor: 'bg-blue-500/5',
    description: 'Briefing do produto/serviço',
  },
  logo: {
    icon: ImageIcon,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40 hover:border-purple-500',
    bgColor: 'bg-purple-500/5',
    description: 'Logo / imagem de referência',
  },
  expert: {
    icon: User,
    color: 'text-rose-400',
    borderColor: 'border-rose-500/40 hover:border-rose-500',
    bgColor: 'bg-rose-500/5',
    description: 'Foto do Expert / Apresentador',
  },
  reference: {
    icon: ImageIcon,
    color: 'text-fuchsia-400',
    borderColor: 'border-fuchsia-500/40 hover:border-fuchsia-500',
    bgColor: 'bg-fuchsia-500/5',
    description: 'Referência visual (estilo, paleta)',
  },
  style: {
    icon: Palette,
    color: 'text-pink-400',
    borderColor: 'border-pink-500/40 hover:border-pink-500',
    bgColor: 'bg-pink-500/5',
    description: 'Tom, paleta e estilo',
  },
  typography: {
    icon: Type,
    color: 'text-orange-400',
    borderColor: 'border-orange-500/40 hover:border-orange-500',
    bgColor: 'bg-orange-500/5',
    description: 'Tipografia (fonte, pesos, cores)',
  },
  'copy-output': {
    icon: Hash,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40 hover:border-amber-500',
    bgColor: 'bg-amber-500/5',
    description: 'Gera 4 variações de copy',
  },
  copies: {
    icon: Hash,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/40 hover:border-yellow-500',
    bgColor: 'bg-yellow-500/5',
    description: 'Várias copys manuais para N criativos',
  },
  'image-output': {
    icon: ImageIcon,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40 hover:border-emerald-500',
    bgColor: 'bg-emerald-500/5',
    description: 'Gera 1 imagem principal',
  },
  'variations-output': {
    icon: Hash,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40 hover:border-cyan-500',
    bgColor: 'bg-cyan-500/5',
    description: 'Gera 4 variações de imagem',
  },
  'batch-output': {
    icon: Zap,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/40 hover:border-violet-500',
    bgColor: 'bg-violet-500/5',
    description: 'Lote de N criativos (1–12) com progresso',
  },
};

export const FlowCanvas: React.FC<FlowCanvasProps> = ({ apiKey, provider, brand }) => {
  const [blocks, setBlocks] = useState<FlowBlock[]>([]);
  const [connections, setConnections] = useState<FlowConnection[]>([]);
  const [draggingBlock, setDraggingBlock] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generateProgress, setGenerateProgress] = useState<{ current: number; total: number } | null>(null);
  const [outputModal, setOutputModal] = useState<{ blockId: string; output: any } | null>(null);
  const [pasteModal, setPasteModal] = useState<{ blockId: string } | null>(null);
  const [creativeText, setCreativeText] = useState({ headline: '', support: '', cta: '' });
  const [downloadingPreview, setDownloadingPreview] = useState<number | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [referencesError, setReferencesError] = useState<string | null>(null);

  // Posicionamento dos textos no preview (X/Y em %)
  type TextPositions = { headline: { x: number; y: number }; support: { x: number; y: number }; cta: { x: number; y: number } };
  const [textPositions, setTextPositions] = useState<TextPositions>(() => {
    if (typeof window === 'undefined') {
      return {
        headline: { x: 8, y: 15 },
        support: { x: 8, y: 75 },
        cta: { x: 8, y: 90 },
      };
    }
    try {
      const saved = localStorage.getItem('flow_text_positions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      headline: { x: 8, y: 15 },
      support: { x: 8, y: 75 },
      cta: { x: 8, y: 90 },
    };
  });

  // Persistir posições de texto automaticamente
  useEffect(() => {
    try {
      localStorage.setItem('flow_text_positions', JSON.stringify(textPositions));
    } catch {}
  }, [textPositions]);

  const resetTextPositions = () => {
    setTextPositions({
      headline: { x: 8, y: 15 },
      support: { x: 8, y: 75 },
      cta: { x: 8, y: 90 },
    });
  };

  // Posicao do logo (X/Y em %) e tamanho (% da largura)
  const [logoPosition, setLogoPosition] = useState<{ x: number; y: number; size: number }>(() => {
    if (typeof window === 'undefined') return { x: 8, y: 8, size: 18 };
    try {
      const saved = localStorage.getItem('flow_logo_position');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 8, y: 8, size: 18 };
  });

  // Persistir posicao do logo
  useEffect(() => {
    try {
      localStorage.setItem('flow_logo_position', JSON.stringify(logoPosition));
    } catch {}
  }, [logoPosition]);

  const resetLogoPosition = () => setLogoPosition({ x: 8, y: 8, size: 18 });

  // Extrair URL do logo a partir dos blocos conectados ao outputModal
  const getLogoUrlForOutput = (): string | null => {
    if (!outputModal) return null;
    const outputBlock = blocks.find((b) => b.id === outputModal.blockId);
    if (!outputBlock) return null;
    const inputBlocks = connections
      .filter((c) => c.to === outputBlock.id)
      .map((c) => blocks.find((b) => b.id === c.from))
      .filter(Boolean) as FlowBlock[];
    return inputBlocks.find((b) => b.type === 'logo')?.data?.imageUrl || null;
  };
  const logoUrlForModal = getLogoUrlForOutput();

  const canvasRef = useRef<HTMLDivElement>(null);
  const referencesInputRef = useRef<HTMLInputElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Criar um novo bloco
  const handleCreateBlock = (type: BlockType) => {
    const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newBlock: FlowBlock = {
      id,
      type,
      label: getDefaultLabel(type),
      x: 100 + (blocks.length % 4) * 280,
      y: 100 + Math.floor(blocks.length / 4) * 200,
      data: getDefaultData(type),
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  // Remover bloco
  const handleRemoveBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
  };

  // Importar referencias escolhidas no navegador. Funciona localmente e na versao publicada.
  const handleImportReferences = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoadingReferences(true);
    setReferencesError(null);
    try {
      const selectedFiles = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
      const files = selectedFiles.slice(0, 30);
      if (files.length === 0) {
        throw new Error('Selecione pelo menos uma imagem válida.');
      }

      const baseY = blocks.length > 0 ? Math.max(...blocks.map((block) => block.y + 190)) : 100;
      const images = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          imageUrl: await optimizeImageDataUrl(await readFileAsDataUrl(file), 1280, 0.78),
          sizeKB: Math.round(file.size / 1024),
        }))
      );
      const newBlocks: FlowBlock[] = images.map((ref, i) => ({
        id: `ref-${Date.now()}-${i}`,
        type: 'reference' as BlockType,
        label: ref.filename.substring(0, 18),
        x: 50 + (i % 6) * 260,
        y: baseY + Math.floor(i / 6) * 180,
        data: {
          imageUrl: ref.imageUrl,
          filename: ref.filename,
          sizeKB: ref.sizeKB,
        },
      }));
      setBlocks((prev) => [...prev, ...newBlocks]);
      if (selectedFiles.length > 30) {
        alert(
          `Importamos 30 imagens. Selecione as demais em uma nova importação para manter a esteira rápida.`
        );
      }
    } catch (err: any) {
      setReferencesError(err.message);
    } finally {
      setLoadingReferences(false);
      event.target.value = '';
    }
  };

  // Iniciar drag de bloco
  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
    if (connecting) return;
    if ((e.target as HTMLElement).closest('button, input, textarea, select, label')) return;
    const block = blocks.find((b) => b.id === blockId);
    if (!block || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left - block.x,
      y: e.clientY - rect.top - block.y,
    };
    setDraggingBlock(blockId);
  };

  // Drag de bloco (mouse move)
  useEffect(() => {
    if (!draggingBlock) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !draggingBlock) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left - dragOffsetRef.current.x);
      const y = Math.max(0, e.clientY - rect.top - dragOffsetRef.current.y);
      setBlocks((prev) =>
        prev.map((b) => (b.id === draggingBlock ? { ...b, x, y } : b))
      );
    };

    const handleMouseUp = () => setDraggingBlock(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBlock]);

  // Listener de ESC para cancelar conexao em progresso
  useEffect(() => {
    if (!connecting) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnecting(null);
        setConnectionMessage(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [connecting]);

  const startConnection = (blockId: string) => {
    setConnecting(blockId);
    setConnectionMessage('Agora clique na ENTRADA do bloco que deve receber estes dados.');
  };

  const finishConnection = (blockId: string) => {
    if (!connecting) {
      setConnectionMessage('Primeiro clique na SAÍDA de um bloco de Briefing, Logo, Referência ou Estilo.');
      return;
    }
    if (connecting === blockId) {
      setConnecting(null);
      setConnectionMessage(null);
      return;
    }
    const exists = connections.some((c) => c.from === connecting && c.to === blockId);
    if (!exists) {
      setConnections((prev) => [
        ...prev,
        { id: `conn-${Date.now()}`, from: connecting, to: blockId },
      ]);
    }
    setConnecting(null);
    setConnectionMessage('Nodes conectados com sucesso.');
    window.setTimeout(() => setConnectionMessage(null), 2500);
  };

  const useCopyInCreative = (copy: string) => {
    const [headline = '', support = '', cta = ''] = copy
      .split('|')
      .map((part) => part.trim());
    setCreativeText({ headline, support, cta });
  };

  const handleDownloadPreview = async (index: number) => {
    const preview = document.getElementById(`flow-creative-preview-${index}`);
    if (!preview) return;
    setDownloadingPreview(index);
    try {
      const dataUrl = await toPng(preview, {
        pixelRatio: 1,
        canvasWidth: 1080,
        canvasHeight: 1080,
        cacheBust: true,
      });
      saveAs(dataUrl, `criativo-esteira-${index + 1}.png`);
    } finally {
      setDownloadingPreview(null);
    }
  };

  // Download em lote (ZIP) de todos os criativos do modal
  const handleDownloadZip = async () => {
    if (!outputModal || !Array.isArray(outputModal.output)) return;
    const images: string[] = outputModal.output.filter(
      (v: any) => typeof v === 'string' && v.startsWith('data:image')
    );
    if (images.length === 0) {
      alert('Nenhuma imagem disponível para empacotar em ZIP.');
      return;
    }

    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < images.length; i++) {
        const preview = document.getElementById(`flow-creative-preview-${i}`);
        if (!preview) continue;
        const dataUrl = await toPng(preview, {
          pixelRatio: 1,
          canvasWidth: 1080,
          canvasHeight: 1080,
          cacheBust: true,
        });
        const base64 = dataUrl.split(',')[1];
        zip.file(`criativo-${i + 1}.png`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `esteira-criativos-${Date.now()}.zip`);
    } catch (err: any) {
      alert(`Erro ao gerar ZIP: ${err.message}`);
    } finally {
      setDownloadingZip(false);
    }
  };

  // Executa TODOS os blocos Gerar Imagem em sequencia (um por um).
  // Util quando o usuario tem 9 blocos image-output, cada um com seu prompt visual proprio.
  const handleExecuteAllImageOutputs = async () => {
    const imageOutputIds = blocks
      .filter((b) => b.type === 'image-output')
      .map((b) => b.id);
    if (imageOutputIds.length === 0) {
      alert('Adicione pelo menos um bloco "Gerar Imagem" antes de executar todos.');
      return;
    }
    for (const id of imageOutputIds) {
      await handleGenerate(id);
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  // Empacota em um unico ZIP todas as imagens geradas por TODOS os blocos image-output.
  const handleDownloadAllResultsZip = async () => {
    const imageBlocksWithOutput = blocks.filter(
      (b) => b.type === 'image-output' && Array.isArray(b.output) && (b.output as any[]).length > 0
    );
    if (imageBlocksWithOutput.length === 0) {
      alert('Nenhum bloco "Gerar Imagem" gerou imagens ainda.');
      return;
    }

    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      let counter = 0;
      for (const block of imageBlocksWithOutput) {
        const output = block.output as any[];
        for (let i = 0; i < output.length; i++) {
          const item = output[i];
          const imageUrl = typeof item === 'string' ? item : item?.imageUrl;
          if (!imageUrl || !imageUrl.startsWith('data:image')) continue;
          counter += 1;
          const preview = document.getElementById(`flow-creative-preview-${i}`);
          let finalDataUrl = imageUrl;
          if (preview) {
            try {
              finalDataUrl = await toPng(preview, {
                pixelRatio: 1,
                canvasWidth: 1080,
                canvasHeight: 1080,
                cacheBust: true,
              });
            } catch {}
          }
          const base64 = finalDataUrl.split(',')[1];
          zip.file(`criativo-${String(counter).padStart(2, '0')}.png`, base64, { base64: true });
        }
      }
      if (counter === 0) {
        alert('Nenhuma imagem encontrada para empacotar.');
        return;
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `esteira-individual-${Date.now()}.zip`);
    } catch (err: any) {
      alert(`Erro ao gerar ZIP: ${err.message}`);
    } finally {
      setDownloadingZip(false);
    }
  };

  // Pegar o bloco de Tipografia conectado a um bloco output (via conexoes)
  const getTypographyForOutput = (outputBlockId: string) => {
    const inputBlocks = connections
      .filter((c) => c.to === outputBlockId)
      .map((c) => blocks.find((b) => b.id === c.from))
      .filter(Boolean) as FlowBlock[];
    return inputBlocks.find((b) => b.type === 'typography')?.data;
  };

  // Renderizar texto com destaque de *palavras* entre asteriscos
  const renderHeadlineWithHighlight = (text: string, highlight: any) => {
    if (!text) return null;
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        const word = part.slice(1, -1);
        return (
          <span
            key={idx}
            style={{
              color: highlight?.color || '#fbbf24',
              textDecoration: highlight?.underline ? 'underline' : 'none',
              textDecorationColor: highlight?.color || '#fbbf24',
              textUnderlineOffset: '4px',
              fontWeight: 'inherit',
            }}
          >
            {word}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Tipografia aplicada ao modal atual
  const typographyForModal = outputModal ? getTypographyForOutput(outputModal.blockId) : null;

  // Gerar saida de um bloco (executa o flow)
  const handleGenerate = async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    // Coleta os dados dos blocos conectados a este
    const inputBlocks = connections
      .filter((c) => c.to === blockId)
      .map((c) => blocks.find((b) => b.id === c.from))
      .filter(Boolean) as FlowBlock[];

    const briefing = inputBlocks.find((b) => b.type === 'briefing')?.data?.text || '';
    const style = inputBlocks.find((b) => b.type === 'style')?.data;
    const logo = inputBlocks.find((b) => b.type === 'logo')?.data?.imageUrl;
    const expertBlock = inputBlocks.find((b) => b.type === 'expert');
    const expertImage = expertBlock?.data?.imageUrl;
    const expertPreserve = expertBlock?.data?.preserveIdentity ?? true;
    const references = inputBlocks
      .filter((b) => b.type === 'reference' && b.data?.imageUrl)
      .map((b) => b.data.imageUrl as string);

    // Copys manuais conectadas (para emparelhar Copy[i] -> Imagem[i])
    const copiesBlock = inputBlocks.find((b) => b.type === 'copies');
    const copiesList: Array<{ id: string; headline: string; support: string; cta?: string; visualPrompt?: string }> =
      (copiesBlock?.data?.items || []).filter(
        (c: any) => c && (c.headline?.trim() || c.support?.trim() || c.cta?.trim() || c.visualPrompt?.trim())
      );

    // Para image-output individual: descobrir o índice deste bloco entre todos os image-output.
    // Isso permite emparelhar Copy[i] <-> Image[i] quando há 9 blocos Gerar Imagem.
    const imageOutputTypes: BlockType[] = ['image-output', 'variations-output', 'batch-output'];
    const sortedImageOutputs = blocks.filter((b) => imageOutputTypes.includes(b.type));
    const myImageIndex = sortedImageOutputs.findIndex((b) => b.id === blockId);

    const requiresBriefing =
      block.type === 'copy-output' ||
      block.type === 'image-output' ||
      block.type === 'variations-output' ||
      block.type === 'batch-output';

    // Para image-output e batch-output: se houver prompt visual (no proprio bloco OU em qualquer copy emparelhada), nao exige briefing global
    const hasBlockVisualPrompt =
      String(block.data?.visualPrompt || '').trim().length > 0;
    const hasAnyCopyVisualPrompt =
      (block.type === 'image-output' && myImageIndex >= 0 && copiesList[myImageIndex]?.visualPrompt?.trim()) ||
      (block.type === 'batch-output' && copiesList.some((c) => c?.visualPrompt?.trim()));
    const hasImageOutputsWithVisualPrompts =
      block.type === 'image-output' && hasBlockVisualPrompt;

    if (!briefing && requiresBriefing && !hasImageOutputsWithVisualPrompts && !hasAnyCopyVisualPrompt) {
      alert('Conecte um bloco "Briefing" ou preencha o campo "Prompt Visual deste bloco" (ou o "Prompt Visual" da copy) antes de gerar. Arraste da bolinha direita do Briefing para a esquerda deste bloco OU cole o prompt diretamente no bloco verde.');
      return;
    }

    if (!apiKey.trim()) {
      alert('Configure sua chave OpenAI no botao "API" antes de gerar os criativos.');
      return;
    }

    setGenerating(blockId);
    try {
      if (block.type === 'copy-output') {
        // Prompt personalizado tem prioridade sobre briefing/estilo
        const userPrompt = String(block.data?.customPrompt || '').trim();
        const desiredCount = Math.min(Math.max(parseInt(String(block.data?.count)) || 4, 1), 12);
        const brief = userPrompt || `${briefing}. Tom: ${style?.tone || 'profissional'}.`;
        const variations = await generateCopyVariations(brief, style, apiKey, desiredCount);
        if (variations[0]) useCopyInCreative(variations[0]);
        setBlocks((prev) =>
          prev.map((b): FlowBlock => (b.id === blockId ? { ...b, output: variations } : b))
        );
        setOutputModal({ blockId, output: variations });
      } else if (
        block.type === 'image-output' ||
        block.type === 'variations-output' ||
        block.type === 'batch-output'
      ) {
        // Lote N (batch-output) com modo "Prompts Individuais":
        // Detecta blocos image-output conectados e usa o prompt visual de cada um.
        const connectedImageOutputs = block.type === 'batch-output'
          ? inputBlocks.filter((b) => b.type === 'image-output')
          : [];
        const useIndividual = block.type === 'batch-output'
          && (block.data?.useIndividualPrompts ?? true)
          && connectedImageOutputs.length > 0;

        let count = 1;
        if (block.type === 'image-output') count = 1;
        else if (block.type === 'variations-output') count = 4;
        else if (block.type === 'batch-output') {
          count = Math.min(Math.max(parseInt(String(block.data.count)) || 9, 1), 12);
          if (useIndividual) {
            count = Math.min(count, connectedImageOutputs.length);
          } else if (copiesList.length > 0) {
            count = Math.min(count, copiesList.length);
          }
        }

        // Determinar o briefing deste bloco (seja image-output individual OU slot do batch)
        const myPairedCopyId = block.data?.pairedCopyId;
        const copyForSelf = myPairedCopyId
          ? copiesList.find((c) => c?.id === myPairedCopyId) ?? copiesList[0]
          : null;

        // Gerar imagens em loop
        const items: Array<{ imageUrl: string; copy?: { headline: string; support: string; cta?: string } }> = [];
        for (let i = 0; i < count; i++) {
          setGenerateProgress({ current: i + 1, total: count });

          // Para batch com prompts individuais: usar o prompt visual do image-output conectado no slot i
          let sourceBlock = block;
          let copyForThis: any = null;
          if (useIndividual && connectedImageOutputs[i]) {
            sourceBlock = connectedImageOutputs[i];
            const ipPairedId = sourceBlock.data?.pairedCopyId;
            copyForThis = ipPairedId
              ? copiesList.find((c) => c?.id === ipPairedId) ?? copiesList[i]
              : copiesList[i] || null;
          } else {
            copyForThis = copyForSelf || copiesList[i] || null;
          }

          // Hierarquia de prompts:
          // 1) Prompt visual do bloco de origem (do image-output conectado OU deste bloco)
          // 2) Prompt visual da copy pareada
          // 3) Briefing global
          const blockVisualPrompt = String(sourceBlock.data?.visualPrompt || '').trim();
          const copyVisualPrompt = String(copyForThis?.visualPrompt || '').trim();
          const effectiveBriefing = blockVisualPrompt || copyVisualPrompt || briefing;

          if (!effectiveBriefing) {
            throw new Error(`Slot ${i + 1} sem briefing nem prompt visual. Preencha o campo "Prompt Visual" do bloco Gerar Imagem ou conecte um bloco Briefing.`);
          }

          const url = await generateImage(effectiveBriefing, style, logo, apiKey, references, expertImage, expertPreserve);
          if (url) {
            items.push(copyForThis ? { imageUrl: url, copy: copyForThis } : { imageUrl: url });
          }
        }

        // Quando vem de Lote N com copies, output eh array de objetos
        // Caso contrario, manter compatibilidade: array de strings OU string unica
        const legacyOutput: string[] = items.map((it) => it.imageUrl);
        setBlocks((prev) =>
          prev.map((b): FlowBlock =>
            b.id === blockId ? { ...b, output: legacyOutput } : b
          )
        );

        // Salvar mapeamento copy -> imagem em um registro separado (por bloco)
        if (copiesList.length > 0) {
          setBlocks((prev) =>
            prev.map((b): FlowBlock =>
              b.id === blockId
                ? {
                    ...b,
                    data: {
                      ...b.data,
                      pairedCopies: items.map((it) => it.copy || null),
                    },
                  }
                : b
            )
          );
        }

        if (block.type === 'image-output' && items[0]) {
          setOutputModal({ blockId, output: items[0].imageUrl });
        } else {
          // Para batch/variations, passamos objetos com imageUrl + copy
          setOutputModal({ blockId, output: items });
        }
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setGenerating(null);
      setGenerateProgress(null);
    }
  };

  const canvasWidth = Math.max(1100, ...blocks.map((block) => block.x + 280));
  const canvasHeight = Math.max(700, ...blocks.map((block) => block.y + 240));

  return (
    <div className="w-full bg-[#0a0b10] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* BARRA DE FERRAMENTAS (topo) */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-[#0d0f17] flex-wrap">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pr-2">
          🎨 Esteira IA — Conecte blocos para criar criativos
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleCreateBlock('briefing')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30"
          >
            <Type size={12} /> Briefing
          </button>
          <button
            onClick={() => handleCreateBlock('copies')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 border border-yellow-500/30"
            title="Insira várias copys manualmente (uma por criativo)"
          >
            <Hash size={12} /> Copys
          </button>
          <button
            onClick={() => handleCreateBlock('logo')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30"
          >
            <ImageIcon size={12} /> Logo
          </button>
          <button
            onClick={() => handleCreateBlock('expert')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30"
            title="Foto do Expert/Apresentador (preserva identidade facial)"
          >
            <User size={12} /> Foto Expert
          </button>
          <button
            onClick={() => handleCreateBlock('reference')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20 border border-fuchsia-500/30"
          >
            <ImageIcon size={12} /> Referência
          </button>
          <input
            ref={referencesInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImportReferences}
          />
          <button
            onClick={() => referencesInputRef.current?.click()}
            disabled={loadingReferences}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 disabled:opacity-50"
            title="Seleciona até 30 imagens e cria um node para cada referência"
          >
            {loadingReferences ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Importar imagens
          </button>
          <button
            onClick={() => handleCreateBlock('style')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 border border-pink-500/30"
          >
            <Palette size={12} /> Estilo
          </button>
          <button
            onClick={() => handleCreateBlock('typography')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 border border-orange-500/30"
            title="Família tipográfica (Manrope padrão), pesos, tamanhos e cores de headline/destaque/destaque de palavra-chave"
          >
            <Type size={12} /> Tipografia
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button
            onClick={() => handleCreateBlock('copy-output')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
          >
            <Hash size={12} /> Gerar Copy
          </button>
          <button
            onClick={() => handleCreateBlock('image-output')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
          >
            <ImageIcon size={12} /> Gerar Imagem
          </button>
          <button
            onClick={() => handleCreateBlock('variations-output')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30"
          >
            <Hash size={12} /> 4 Variações
          </button>
          <button
            onClick={() => handleCreateBlock('batch-output')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/30"
            title="Lote de 1 a 12 criativos gerados a partir do mesmo briefing"
          >
            <Zap size={12} /> Lote N
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button
            onClick={handleExecuteAllImageOutputs}
            disabled={!!generating || blocks.filter((b) => b.type === 'image-output').length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-500/40 disabled:opacity-50"
            title="Executa todos os blocos Gerar Imagem em sequência (cada um usa a copy e prompt visual correspondentes)"
          >
            <Play size={12} /> Executar Todos
          </button>
          <button
            onClick={handleDownloadAllResultsZip}
            disabled={downloadingZip || blocks.filter((b) => b.type === 'image-output' && Array.isArray(b.output) && b.output.length > 0).length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 disabled:opacity-50"
            title="Empacota em um ZIP todas as imagens geradas por todos os blocos Gerar Imagem"
          >
            <Archive size={12} /> ZIP Todos
          </button>
        </div>
      </div>

      <div className="grid gap-2 p-3 border-b border-white/10 bg-[#0b0d14] sm:grid-cols-[auto_1fr_1fr_0.7fr] sm:items-end">
        <div className="sm:pb-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white">Textos do criativo</p>
          <p className="text-[9px] text-gray-500">Edite aqui ou gere uma copy para preencher.</p>
        </div>
        <label className="space-y-1">
          <span className="block text-[9px] font-bold uppercase text-gray-500">Headline</span>
          <input
            aria-label="Headline do criativo"
            value={creativeText.headline}
            onChange={(event) => setCreativeText((current) => ({ ...current, headline: event.target.value }))}
            placeholder="Título principal"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-400"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[9px] font-bold uppercase text-gray-500">Destaque</span>
          <input
            aria-label="Destaque do criativo"
            value={creativeText.support}
            onChange={(event) => setCreativeText((current) => ({ ...current, support: event.target.value }))}
            placeholder="Complemento da mensagem"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-400"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[9px] font-bold uppercase text-gray-500">CTA</span>
          <input
            aria-label="CTA do criativo"
            value={creativeText.cta}
            onChange={(event) => setCreativeText((current) => ({ ...current, cta: event.target.value }))}
            placeholder="Saiba mais"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-400"
          />
        </label>
      </div>

      {/* AREA DO CANVAS (meio) */}
      <div className="h-[700px] 2xl:h-[820px] w-full overflow-auto bg-[#07090e]">
        <div
          ref={canvasRef}
          className="relative bg-[#07090e]"
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        >
        {blocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center mb-4">
                <Sparkles size={32} className="text-dark-900" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Comece criando seu fluxo</h3>
              <p className="text-sm text-gray-400">
                Adicione um <strong className="text-blue-400">Briefing</strong>, conecte com <strong className="text-emerald-400">Gerar Imagem</strong> ou <strong className="text-amber-400">Gerar Copy</strong> e clique em <strong>▶</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Conexoes SVG */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
          {connections.map((conn) => {
            const fromBlock = blocks.find((b) => b.id === conn.from);
            const toBlock = blocks.find((b) => b.id === conn.to);
            if (!fromBlock || !toBlock) return null;
            const x1 = fromBlock.x + 240;
            const y1 = fromBlock.y + 40;
            const x2 = toBlock.x;
            const y2 = toBlock.y + 40;
            const midX = (x1 + x2) / 2;
            const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
            return (
              <path
                key={conn.id}
                d={path}
                stroke="rgb(16, 185, 129)"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            );
          })}
          {/* Linha de conexao em progresso */}
          {connecting && (() => {
            const block = blocks.find((b) => b.id === connecting);
            if (!block) return null;
            return null; // simplificado
          })()}
        </svg>

        {/* Blocos */}
        {blocks.map((block) => {
          const config = BLOCK_CONFIG[block.type];
          const Icon = config.icon;
          const isOutput = block.type.includes('output');
          const isConnecting = connecting === block.id;
          return (
            <div
              key={block.id}
              onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
              style={{
                left: block.x,
                top: block.y,
                position: 'absolute',
                width: '240px',
                cursor: draggingBlock === block.id ? 'grabbing' : 'grab',
              }}
              className={`rounded-2xl border-2 ${config.borderColor} ${config.bgColor} backdrop-blur-sm shadow-xl transition-all ${
                isConnecting ? 'ring-2 ring-emerald-400 scale-105' : ''
              }`}
            >
              {/* HEADER */}
              <div className="flex items-center justify-between p-2.5 border-b border-white/10">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Icon size={14} className={config.color} />
                  <span className={`text-[11px] font-bold ${config.color} truncate`}>{block.label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isOutput && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startConnection(block.id);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                        connecting === block.id
                          ? 'bg-emerald-500 text-white animate-pulse ring-2 ring-emerald-300'
                          : `${config.color.replace('text', 'bg')} ${config.color} hover:scale-110`
                      }`}
                      title="Clique para iniciar uma conexão deste bloco"
                    >
                      {connecting === block.id ? '✓' : '🔌 Saída'}
                    </button>
                  )}
                  {isOutput && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerate(block.id);
                      }}
                      disabled={generating === block.id}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${config.color.replace('text', 'bg')} ${config.color} hover:opacity-80 disabled:opacity-50 flex items-center gap-1`}
                      title="Executar"
                    >
                      {generating === block.id ? <Loader2 size={9} className="animate-spin" /> : <Play size={9} />}
                      {generating === block.id ? '...' : '▶'}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBlock(block.id);
                    }}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* CONTEUDO */}
              <div className="p-2.5 space-y-1.5">
                {block.type === 'briefing' && (
                  <textarea
                    rows={4}
                    value={block.data.text || ''}
                    onChange={(e) => {
                      const newText = e.target.value;
                      setBlocks((prev) =>
                        prev.map((b) =>
                          b.id === block.id ? { ...b, data: { ...b.data, text: newText } } : b
                        )
                      );
                    }}
                    placeholder="Produto:&#10;Publico:&#10;Dor:&#10;Objetivo:"
                    className="w-full px-2 py-1.5 rounded-md bg-black/40 border border-white/10 text-white text-[10px] placeholder-gray-500 focus:border-white/30 focus:outline-none resize-none"
                  />
                )}

                {block.type === 'logo' && (
                  <div>
                    {block.data.imageUrl ? (
                      <div className="relative">
                        <img
                          src={block.data.imageUrl}
                          alt="Logo"
                          className="w-full h-16 object-contain bg-white/5 rounded-md"
                        />
                        <button
                          onClick={() => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, imageUrl: null } } : b
                              )
                            );
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-16 border-2 border-dashed border-white/15 rounded-md cursor-pointer hover:border-white/30 transition-colors">
                        <Upload size={14} className="text-gray-400 mb-0.5" />
                        <span className="text-[9px] text-gray-500">Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id ? { ...b, data: { ...b.data, imageUrl: reader.result as string } } : b
                                )
                              );
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}

                {block.type === 'expert' && (
                  <div className="space-y-1.5">
                    {block.data.imageUrl ? (
                      <div className="relative">
                        <img
                          src={block.data.imageUrl}
                          alt="Expert"
                          className="w-full h-24 object-cover rounded-md bg-white/5"
                        />
                        <button
                          onClick={() => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, imageUrl: null } } : b
                              )
                            );
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-rose-500/30 rounded-md cursor-pointer hover:border-rose-500/60 transition-colors bg-rose-500/[0.04]">
                        <User size={14} className="text-rose-400 mb-0.5" />
                        <span className="text-[9px] text-rose-300 font-bold">Foto do Expert</span>
                        <span className="text-[8px] text-gray-500">PNG recortado</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id ? { ...b, data: { ...b.data, imageUrl: reader.result as string } } : b
                                )
                              );
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}
                    <label className="flex items-center gap-1.5 text-[9px] text-gray-300 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={block.data.preserveIdentity ?? true}
                        onChange={(e) => {
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === block.id
                                ? { ...b, data: { ...b.data, preserveIdentity: e.target.checked } }
                                : b
                            )
                          );
                        }}
                        className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-rose-400"
                      />
                      <span className="leading-tight">Preservar identidade facial (recomendado)</span>
                    </label>
                  </div>
                )}

                {block.type === 'copies' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-300 font-bold">
                        {(block.data.items?.length || 0)} copys
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPasteModal({ blockId: block.id });
                          }}
                          className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[9px] font-bold hover:bg-yellow-500/30 border border-yellow-500/30"
                          title="Colar várias linhas (uma por copy, separadas por linha em branco ou ---)"
                        >
                          📋 Colar
                        </button>
                      </div>
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {(block.data.items || []).map((item: any, idx: number) => (
                        <div key={item.id} className="rounded-lg bg-black/30 border border-white/10 p-1.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] text-yellow-400 font-bold">COPY {idx + 1}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBlocks((prev) =>
                                  prev.map((b) =>
                                    b.id === block.id
                                      ? {
                                          ...b,
                                          data: {
                                            ...b.data,
                                            items: (b.data.items || []).filter(
                                              (it: any) => it.id !== item.id
                                            ),
                                          },
                                        }
                                      : b
                                  )
                                );
                              }}
                              className="text-gray-500 hover:text-red-400"
                              title="Remover copy"
                            >
                              <X size={11} />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Headline"
                            value={item.headline}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id
                                    ? {
                                        ...b,
                                        data: {
                                          ...b.data,
                                          items: (b.data.items || []).map((it: any) =>
                                            it.id === item.id ? { ...it, headline: v } : it
                                          ),
                                        },
                                      }
                                    : b
                                )
                              );
                            }}
                            className="w-full px-1.5 py-1 rounded bg-black/40 border border-white/10 text-white text-[10px] focus:border-yellow-400 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Destaque"
                            value={item.support}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id
                                    ? {
                                        ...b,
                                        data: {
                                          ...b.data,
                                          items: (b.data.items || []).map((it: any) =>
                                            it.id === item.id ? { ...it, support: v } : it
                                          ),
                                        },
                                      }
                                    : b
                                )
                              );
                            }}
                            className="w-full px-1.5 py-1 rounded bg-black/40 border border-white/10 text-white text-[10px] focus:border-yellow-400 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="CTA (opcional)"
                            value={item.cta || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id
                                    ? {
                                        ...b,
                                        data: {
                                          ...b.data,
                                          items: (b.data.items || []).map((it: any) =>
                                            it.id === item.id ? { ...it, cta: v } : it
                                          ),
                                        },
                                      }
                                    : b
                                )
                              );
                            }}
                            className="w-full px-1.5 py-1 rounded bg-black/40 border border-white/10 text-white text-[10px] focus:border-yellow-400 focus:outline-none"
                          />
                          <div className="pt-0.5">
                            <label className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-fuchsia-400">
                              <Sparkles size={8} /> Prompt Visual (sobrescreve briefing)
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Descreva a cena deste criativo. Ex: smartphone com analytics mostrando engajamento alto vs agendamentos zerados..."
                              value={item.visualPrompt || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                setBlocks((prev) =>
                                  prev.map((b) =>
                                    b.id === block.id
                                      ? {
                                          ...b,
                                          data: {
                                            ...b.data,
                                            items: (b.data.items || []).map((it: any) =>
                                              it.id === item.id ? { ...it, visualPrompt: v } : it
                                            ),
                                          },
                                        }
                                      : b
                                  )
                                );
                              }}
                              className="w-full px-1.5 py-1 rounded bg-black/40 border border-fuchsia-500/30 text-white text-[10px] placeholder-gray-500 focus:border-fuchsia-400 focus:outline-none resize-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id
                              ? {
                                  ...b,
                                  data: {
                                    ...b.data,
                                    items: [
                                      ...(b.data.items || []),
                                      {
                                        id: `copy-${Date.now()}-${(b.data.items?.length || 0) + 1}`,
                                        headline: '',
                                        support: '',
                                        cta: '',
                                      },
                                    ],
                                  },
                                }
                              : b
                          )
                        );
                      }}
                      className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-dashed border-yellow-500/40 text-yellow-300 text-[10px] font-bold hover:bg-yellow-500/10"
                    >
                      <Plus size={11} /> Adicionar copy
                    </button>
                  </div>
                )}

                {block.type === 'reference' && (
                  <div>
                    {block.data.imageUrl ? (
                      <div className="relative">
                        <img
                          src={block.data.imageUrl}
                          alt={block.data.filename || 'ref'}
                          className="w-full h-20 object-cover rounded-md"
                          title={block.data.filename}
                        />
                        <button
                          onClick={() => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id
                                  ? { ...b, data: { ...b.data, imageUrl: null, filename: null } }
                                  : b
                              )
                            );
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X size={10} />
                        </button>
                        {block.data.filename && (
                          <p className="text-[8px] text-gray-400 mt-1 truncate">{block.data.filename}</p>
                        )}
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-white/15 rounded-md cursor-pointer hover:border-white/30 transition-colors">
                        <Upload size={14} className="text-gray-400 mb-0.5" />
                        <span className="text-[9px] text-gray-500">Upload ref</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id
                                    ? {
                                        ...b,
                                        data: {
                                          ...b.data,
                                          imageUrl: reader.result as string,
                                          filename: file.name,
                                        },
                                      }
                                    : b
                                )
                              );
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}

                {block.type === 'style' && (
                  <div className="space-y-1">
                    <select
                      value={block.data.tone || ''}
                      onChange={(e) => {
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id ? { ...b, data: { ...b.data, tone: e.target.value } } : b
                          )
                        );
                      }}
                      className="w-full px-2 py-1 rounded-md bg-black/40 border border-white/10 text-white text-[10px]"
                    >
                      <option value="">Tom...</option>
                      <option value="profissional">Profissional</option>
                      <option value="casual">Casual</option>
                      <option value="urgente">Urgente</option>
                      <option value="luxo">Luxo</option>
                      <option value="divertido">Divertido</option>
                    </select>
                    <input
                      type="color"
                      value={block.data.color || '#10b981'}
                      onChange={(e) => {
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id ? { ...b, data: { ...b.data, color: e.target.value } } : b
                          )
                        );
                      }}
                      className="w-full h-6 rounded border border-white/10 cursor-pointer"
                    />
                  </div>
                )}

                {block.type === 'typography' && (
                  <div className="space-y-1.5">
                    <div>
                      <label className="block text-[8px] font-bold uppercase text-orange-300 mb-0.5">Família</label>
                      <select
                        value={block.data.fontFamily || 'Manrope'}
                        onChange={(e) => {
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === block.id ? { ...b, data: { ...b.data, fontFamily: e.target.value } } : b
                            )
                          );
                        }}
                        className="w-full px-2 py-1 rounded-md bg-black/40 border border-white/10 text-white text-[10px]"
                      >
                        <option value="Manrope">Manrope (padrão do cliente)</option>
                        <option value="Inter">Inter</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Bebas Neue">Bebas Neue</option>
                        <option value="Anton">Anton</option>
                        <option value="Roboto">Roboto</option>
                      </select>
                    </div>

                    {/* HEADLINE */}
                    <div className="rounded-md bg-black/30 border border-white/10 p-1.5 space-y-1">
                      <label className="block text-[8px] font-bold uppercase text-orange-300">Headline</label>
                      <div className="flex gap-1">
                        <select
                          value={block.data.headline?.weight || '800'}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, headline: { ...b.data.headline, weight: e.target.value } } } : b
                              )
                            );
                          }}
                          className="flex-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white text-[9px]"
                        >
                          <option value="300">Light 300</option>
                          <option value="400">Regular 400</option>
                          <option value="500">Medium 500</option>
                          <option value="600">SemiBold 600</option>
                          <option value="700">Bold 700</option>
                          <option value="800">ExtraBold 800</option>
                        </select>
                        <input
                          type="color"
                          value={block.data.headline?.color || '#ffffff'}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, headline: { ...b.data.headline, color: e.target.value } } } : b
                              )
                            );
                          }}
                          className="w-7 h-6 rounded border border-white/10 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400">
                        <span className="font-mono">{block.data.headline?.size || 56}px</span>
                        <input
                          type="range"
                          min={20}
                          max={120}
                          value={block.data.headline?.size || 56}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, headline: { ...b.data.headline, size: Number(e.target.value) } } } : b
                              )
                            );
                          }}
                          className="flex-1 accent-orange-400"
                          aria-label="Headline size"
                        />
                      </div>
                    </div>

                    {/* DESTAQUE */}
                    <div className="rounded-md bg-black/30 border border-white/10 p-1.5 space-y-1">
                      <label className="block text-[8px] font-bold uppercase text-orange-300">Destaque</label>
                      <div className="flex gap-1">
                        <select
                          value={block.data.support?.weight || '400'}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, support: { ...b.data.support, weight: e.target.value } } } : b
                              )
                            );
                          }}
                          className="flex-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white text-[9px]"
                        >
                          <option value="300">Light 300</option>
                          <option value="400">Regular 400</option>
                          <option value="500">Medium 500</option>
                          <option value="600">SemiBold 600</option>
                          <option value="700">Bold 700</option>
                        </select>
                        <input
                          type="color"
                          value={block.data.support?.color || '#f5f5f5'}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, support: { ...b.data.support, color: e.target.value } } } : b
                              )
                            );
                          }}
                          className="w-7 h-6 rounded border border-white/10 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400">
                        <span className="font-mono">{block.data.support?.size || 22}px</span>
                        <input
                          type="range"
                          min={12}
                          max={48}
                          value={block.data.support?.size || 22}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, support: { ...b.data.support, size: Number(e.target.value) } } } : b
                              )
                            );
                          }}
                          className="flex-1 accent-orange-400"
                          aria-label="Support size"
                        />
                      </div>
                    </div>

                    {/* CTA (opcional) */}
                    <div className="rounded-md bg-black/30 border border-white/10 p-1.5 space-y-1">
                      <label className="block text-[8px] font-bold uppercase text-orange-300">CTA</label>
                      <div className="flex gap-1">
                        <select
                          value={block.data.cta?.weight || '700'}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, cta: { ...b.data.cta, weight: e.target.value } } } : b
                              )
                            );
                          }}
                          className="flex-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white text-[9px]"
                        >
                          <option value="400">Regular 400</option>
                          <option value="600">SemiBold 600</option>
                          <option value="700">Bold 700</option>
                          <option value="800">ExtraBold 800</option>
                        </select>
                        <input
                          type="color"
                          value={block.data.cta?.color || '#0a0b10'}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, cta: { ...b.data.cta, color: e.target.value } } } : b
                              )
                            );
                          }}
                          className="w-7 h-6 rounded border border-white/10 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400">
                        <span className="font-mono">bg</span>
                        <input
                          type="color"
                          value={block.data.cta?.bgColor || '#10b981'}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, cta: { ...b.data.cta, bgColor: e.target.value } } } : b
                              )
                            );
                          }}
                          className="w-7 h-5 rounded border border-white/10 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* PALAVRA DESTAQUE */}
                    <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-1.5 space-y-1">
                      <label className="block text-[8px] font-bold uppercase text-amber-300">Palavra Destaque</label>
                      <p className="text-[8px] text-amber-200/80 leading-tight">
                        Marque palavras com *asterisco* na copy para destacar.
                      </p>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={block.data.highlight?.color || '#fbbf24'}
                          onChange={(e) => {
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, data: { ...b.data, highlight: { ...b.data.highlight, color: e.target.value } } } : b
                              )
                            );
                          }}
                          className="w-7 h-6 rounded border border-white/10 cursor-pointer"
                        />
                        <label className="flex items-center gap-1 text-[9px] text-amber-300">
                          <input
                            type="checkbox"
                            checked={block.data.highlight?.underline ?? true}
                            onChange={(e) => {
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id ? { ...b, data: { ...b.data, highlight: { ...b.data.highlight, underline: e.target.checked } } } : b
                                )
                              );
                            }}
                            className="rounded border-white/20 bg-black/40 text-amber-500"
                          />
                          Sublinhar
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {block.type === 'image-output' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[9px] font-bold uppercase text-emerald-300 flex items-center gap-1">
                        <Sparkles size={9} /> Prompt Visual deste bloco
                      </label>
                      <span className="text-[8px] text-emerald-400 font-mono">
                        {(block.data.visualPrompt || '').length}/800
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={800}
                      value={block.data.visualPrompt || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id ? { ...b, data: { ...b.data, visualPrompt: v } } : b
                          )
                        );
                      }}
                      placeholder="Descreva a cena deste criativo. Tem prioridade sobre o briefing global conectado."
                      className="w-full px-2 py-1.5 rounded-md bg-black/40 border border-emerald-500/30 text-white text-[10px] placeholder-gray-500 focus:border-emerald-400 focus:outline-none resize-none"
                    />
                    {(block.data.visualPrompt || '').trim() && (
                      <p className="text-[8px] text-emerald-300 leading-tight">
                        ✨ Prompt visual deste bloco ativo.
                      </p>
                    )}

                    {/* DROPDOWN: Copy de origem (emparelhamento explicito) */}
                    {(() => {
                      const inputCopiesBlocks = connections
                        .filter((c) => c.to === block.id)
                        .map((c) => blocks.find((b) => b.id === c.from))
                        .filter((b): b is FlowBlock => !!b && b.type === 'copies');
                      const copiesItems: any[] = inputCopiesBlocks.flatMap((b) => b.data?.items || []);
                      if (copiesItems.length === 0) return null;
                      return (
                        <div className="pt-1">
                          <label className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-yellow-400">
                            <Hash size={8} /> Copy de origem
                          </label>
                          <select
                            value={block.data.pairedCopyId ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id
                                    ? { ...b, data: { ...b.data, pairedCopyId: v || null } }
                                    : b
                                )
                              );
                            }}
                            className="w-full px-1.5 py-1 rounded bg-black/40 border border-yellow-500/30 text-white text-[10px]"
                          >
                            <option value="">— Automático (por índice) —</option>
                            {copiesItems.map((c: any, i: number) => (
                              <option key={c.id} value={c.id}>
                                COPY {i + 1}: {(c.headline || '(sem headline)').substring(0, 40)}
                              </option>
                            ))}
                          </select>
                          {block.data.pairedCopyId && (
                            <p className="text-[8px] text-yellow-300 leading-tight mt-0.5">
                              🔗 Emparelhado com copy específica do bloco amarelo
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {block.type === 'copy-output' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[9px] font-bold uppercase text-gray-400 flex items-center gap-1">
                        <Sparkles size={9} className="text-amber-300" /> Prompt personalizado
                      </label>
                      <span className="text-[8px] text-amber-400 font-mono">
                        {(block.data.customPrompt || '').length}/800
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={800}
                      value={block.data.customPrompt || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id ? { ...b, data: { ...b.data, customPrompt: v } } : b
                          )
                        );
                      }}
                      placeholder="Ex: Crie 9 copys para classe média 30-50 anos variando os ângulos: dor do cliente, prova social, comparação, escassez, etc. Use PAS (Problema-Agitação-Solução) e termine com CTA forte."
                      className="w-full px-2 py-1.5 rounded-md bg-black/40 border border-amber-500/30 text-white text-[10px] placeholder-gray-500 focus:border-amber-400 focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-bold uppercase text-gray-400">
                        Quantidade (1-12)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={block.data.count ?? 4}
                        onChange={(e) => {
                          const v = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 12);
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === block.id ? { ...b, data: { ...b.data, count: v } } : b
                            )
                          );
                        }}
                        className="w-14 px-1.5 py-1 rounded-md bg-black/40 border border-white/10 text-white text-[10px] focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    {(block.data.customPrompt || '').trim() && (
                      <p className="text-[8px] text-amber-300 leading-tight">
                        ✨ Prompt personalizado ativo (tem prioridade sobre briefing/estilo).
                      </p>
                    )}
                  </div>
                )}

                {block.type === 'batch-output' && (
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase text-gray-400">
                      Quantidade (1-12)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={block.data.count ?? 9}
                      onChange={(e) => {
                        const v = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 12);
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id ? { ...b, data: { ...b.data, count: v } } : b
                          )
                        );
                      }}
                      className="w-full px-2 py-1.5 rounded-md bg-black/40 border border-white/10 text-white text-xs focus:border-violet-400 focus:outline-none"
                    />
                    <p className="text-[8px] text-gray-500 leading-tight">
                      Tempo médio: ~{(block.data.count ?? 9) * 8}s
                    </p>
                    <label className="flex items-center gap-1.5 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={block.data.useIndividualPrompts ?? true}
                        onChange={(e) => {
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === block.id ? { ...b, data: { ...b.data, useIndividualPrompts: e.target.checked } } : b
                            )
                          );
                        }}
                        className="rounded border-violet-500/30 bg-black/40 text-violet-400 focus:ring-violet-400"
                      />
                      <span className="text-[8px] font-bold uppercase tracking-wider text-violet-300">
                        Prompts individuais (recomendado)
                      </span>
                    </label>
                  </div>
                )}

                {isOutput && (
                  <div className="min-h-[60px] flex flex-col items-center justify-center bg-black/20 rounded-md">
                    {generating === block.id ? (
                      <div className="flex flex-col items-center gap-1 py-2">
                        <Loader2 size={18} className={`${config.color} animate-spin`} />
                        <span className="text-[9px] text-gray-400">
                          {generateProgress && block.type === 'batch-output'
                            ? `Gerando ${generateProgress.current}/${generateProgress.total}...`
                            : 'Gerando...'}
                        </span>
                      </div>
                    ) : block.output ? (
                      <div className="w-full p-1.5 max-h-32 overflow-y-auto">
                        {Array.isArray(block.output) ? (
                          <div className="space-y-1">
                            {block.output.map((out: any, i: number) => (
                              <div key={i} className="text-[9px] text-gray-300 truncate">
                                {typeof out === 'string' && out.startsWith('data:image') ? (
                                  <img src={out} alt={`out ${i}`} className="w-full rounded" />
                                ) : (
                                  typeof out === 'string' ? out : JSON.stringify(out).substring(0, 50)
                                )}
                              </div>
                            ))}
                          </div>
                        ) : typeof block.output === 'string' && block.output.startsWith('data:image') ? (
                          <img src={block.output} alt="out" className="w-full rounded" />
                        ) : (
                          <p className="text-[9px] text-gray-300">{block.output}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-500 italic">Sem output</span>
                    )}
                    {block.output && !generating && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setOutputModal({ blockId: block.id, output: block.output });
                        }}
                        className="m-1.5 w-[calc(100%-0.75rem)] rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-white hover:bg-white/10"
                      >
                        Visualizar resultado
                      </button>
                    )}
                  </div>
                )}

                {/* Ponto de conexao na esquerda (input) para outputs - MAIOR e mais visivel */}
                {isOutput && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      finishConnection(block.id);
                    }}
                    className={`absolute -left-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all border-2 border-[#0a0b10] ${
                      connecting === block.id
                        ? 'bg-emerald-500 text-white animate-pulse ring-2 ring-emerald-300'
                        : 'bg-emerald-500/80 text-white hover:bg-emerald-400 hover:scale-110 shadow-lg'
                    }`}
                    title="Clique para receber uma conexão"
                  >
                    {connecting === block.id ? '✓ Conectando' : '📥 Entrada'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Status da conexão */}
        {(connecting || connectionMessage) && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-100 text-xs font-bold shadow-xl animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {connectionMessage}
            {connecting && (
              <button
                onClick={() => {
                  setConnecting(null);
                  setConnectionMessage(null);
                }}
                className="ml-2 px-2 py-0.5 bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-100 rounded text-[10px]"
              >
                Cancelar (ESC)
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {/* MODAL DE OUTPUT DETALHADO */}
      {outputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#0d0f17] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Resultado Gerado pela IA</h3>
              <div className="flex items-center gap-2">
                {Array.isArray(outputModal.output) && outputModal.output.length > 1 && (
                  <button
                    onClick={handleDownloadZip}
                    disabled={downloadingZip}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 shadow-md"
                  >
                    {downloadingZip ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
                    {downloadingZip ? 'Empacotando...' : `Baixar Todos (ZIP)`}
                  </button>
                )}
                <button onClick={() => setOutputModal(null)} className="text-gray-400 hover:text-white p-1.5">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* SLIDERS DE POSICAO DOS TEXTOS (X/Y %) */}
            <div className="mb-5 p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  📐 Posição dos Textos (X / Y %)
                </h4>
                <button
                  onClick={resetTextPositions}
                  className="text-[10px] text-gray-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:border-white/30"
                >
                  Resetar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['headline', 'support', 'cta'] as const).map((key) => (
                  <div key={key} className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-300 uppercase tracking-wider">
                        {key === 'headline' ? 'Headline' : key === 'support' ? 'Destaque' : 'CTA'}
                      </span>
                      <span className="text-gray-400 font-mono">
                        X {Math.round(textPositions[key].x)}% · Y {Math.round(textPositions[key].y)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={textPositions[key].x}
                      onChange={(e) =>
                        setTextPositions((prev: TextPositions) => ({
                          ...prev,
                          [key]: { ...prev[key], x: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-emerald-400"
                      aria-label={`${key} X`}
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={textPositions[key].y}
                      onChange={(e) =>
                        setTextPositions((prev: TextPositions) => ({
                          ...prev,
                          [key]: { ...prev[key], y: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-emerald-400"
                      aria-label={`${key} Y`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SLIDERS DE POSICAO DO LOGO (X/Y/Tamanho) */}
            {logoUrlForModal && (
              <div className="mb-5 p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    🏷️ Posição do Logo (X / Y / Tamanho %)
                  </h4>
                  <button
                    onClick={resetLogoPosition}
                    className="text-[10px] text-gray-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:border-white/30"
                  >
                    Resetar
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-purple-300 uppercase tracking-wider">X</span>
                      <span className="text-gray-400 font-mono">{Math.round(logoPosition.x)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={logoPosition.x}
                      onChange={(e) => setLogoPosition((p) => ({ ...p, x: Number(e.target.value) }))}
                      className="w-full accent-purple-400"
                      aria-label="Logo X"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-purple-300 uppercase tracking-wider">Y</span>
                      <span className="text-gray-400 font-mono">{Math.round(logoPosition.y)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={logoPosition.y}
                      onChange={(e) => setLogoPosition((p) => ({ ...p, y: Number(e.target.value) }))}
                      className="w-full accent-purple-400"
                      aria-label="Logo Y"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-purple-300 uppercase tracking-wider">Tamanho</span>
                      <span className="text-gray-400 font-mono">{Math.round(logoPosition.size)}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={logoPosition.size}
                      onChange={(e) => setLogoPosition((p) => ({ ...p, size: Number(e.target.value) }))}
                      className="w-full accent-purple-400"
                      aria-label="Logo size"
                    />
                  </div>
                </div>
              </div>
            )}

            {Array.isArray(outputModal.output) ? (
              <div className="grid grid-cols-2 gap-3">
                {outputModal.output.map((out: any, i: number) => {
                  // Suporte ao novo formato { imageUrl, copy } OU string legado
                  const imageUrl: string | null =
                    typeof out === 'string' ? out : out?.imageUrl || null;
                  const pairedCopy = typeof out === 'object' ? out?.copy : null;
                  const headlineToShow = pairedCopy?.headline || creativeText.headline;
                  const supportToShow = pairedCopy?.support || creativeText.support;
                  const ctaToShow = pairedCopy?.cta || creativeText.cta;

                  return (
                    <div key={i} className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                      {imageUrl ? (
                        <>
                          <div id={`flow-creative-preview-${i}`} className="relative aspect-square overflow-hidden bg-black">
                            <img src={imageUrl} alt={`Resultado ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                            {logoUrlForModal && (
                              <img
                                src={logoUrlForModal}
                                alt="Logo"
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${logoPosition.x}%`,
                                  top: `${logoPosition.y}%`,
                                  width: `${logoPosition.size}%`,
                                  maxHeight: '20%',
                                  objectFit: 'contain',
                                  transform: 'translate(0, 0)',
                                }}
                              />
                            )}
                            {headlineToShow && (
                              <h4
                                className="absolute uppercase leading-[0.95] drop-shadow-lg max-w-[85%]"
                                style={{
                                  left: `${textPositions.headline.x}%`,
                                  top: `${textPositions.headline.y}%`,
                                  fontFamily: typographyForModal?.fontFamily || 'Manrope, sans-serif',
                                  fontWeight: typographyForModal?.headline?.weight || 800,
                                  fontSize: `${typographyForModal?.headline?.size || 36}px`,
                                  color: typographyForModal?.headline?.color || '#ffffff',
                                }}
                              >
                                {renderHeadlineWithHighlight(headlineToShow, typographyForModal?.highlight)}
                              </h4>
                            )}
                            {supportToShow && (
                              <p
                                className="absolute max-w-[85%] leading-tight drop-shadow"
                                style={{
                                  left: `${textPositions.support.x}%`,
                                  top: `${textPositions.support.y}%`,
                                  fontFamily: typographyForModal?.fontFamily || 'Manrope, sans-serif',
                                  fontWeight: typographyForModal?.support?.weight || 400,
                                  fontSize: `${typographyForModal?.support?.size || 16}px`,
                                  color: typographyForModal?.support?.color || '#f5f5f5',
                                }}
                              >
                                {supportToShow}
                              </p>
                            )}
                            {ctaToShow && (
                              <span
                                className="absolute inline-flex rounded-lg px-3 py-2 uppercase shadow-lg"
                                style={{
                                  left: `${textPositions.cta.x}%`,
                                  top: `${textPositions.cta.y}%`,
                                  fontFamily: typographyForModal?.fontFamily || 'Manrope, sans-serif',
                                  fontWeight: typographyForModal?.cta?.weight || 700,
                                  fontSize: `${typographyForModal?.cta?.size || 14}px`,
                                  color: typographyForModal?.cta?.color || '#0a0b10',
                                  backgroundColor: typographyForModal?.cta?.bgColor || '#10b981',
                                }}
                              >
                                {ctaToShow}
                              </span>
                            )}
                          </div>
                          {pairedCopy && (
                            <div className="bg-yellow-500/10 border-t border-yellow-500/30 px-3 py-1.5 text-[10px] text-yellow-200 font-bold">
                              📝 Copy {i + 1}: {pairedCopy.headline || '(sem headline)'} · {pairedCopy.cta || '(sem CTA)'}
                            </div>
                          )}
                          <button
                            onClick={() => handleDownloadPreview(i)}
                            disabled={downloadingPreview === i}
                            className="flex w-full items-center justify-center gap-2 border-t border-white/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                          >
                            {downloadingPreview === i ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                            Baixar PNG
                          </button>
                        </>
                      ) : (
                        <div className="space-y-3 p-3 bg-black/30">
                          <p className="text-xs text-gray-300">{typeof out === 'string' ? out : JSON.stringify(out, null, 2)}</p>
                          {typeof out === 'string' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => useCopyInCreative(out)}
                                className="flex-1 rounded-md bg-amber-400 px-2 py-1.5 text-[10px] font-black text-black hover:bg-amber-300"
                              >
                                Usar esta copy
                              </button>
                              <button
                                onClick={() => navigator.clipboard.writeText(out)}
                                aria-label="Copiar texto"
                                className="rounded-md border border-white/10 px-2 text-gray-300 hover:bg-white/10"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : typeof outputModal.output === 'string' && outputModal.output.startsWith('data:image') ? (
              <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <div id="flow-creative-preview-0" className="relative aspect-square overflow-hidden bg-black">
                  <img src={outputModal.output} alt="Resultado" className="absolute inset-0 h-full w-full object-cover" />
                  {logoUrlForModal && (
                    <img
                      src={logoUrlForModal}
                      alt="Logo"
                      className="absolute pointer-events-none"
                      style={{
                        left: `${logoPosition.x}%`,
                        top: `${logoPosition.y}%`,
                        width: `${logoPosition.size}%`,
                        maxHeight: '20%',
                        objectFit: 'contain',
                      }}
                    />
                  )}
                  {creativeText.headline && (
                    <h4
                      className="absolute uppercase leading-[0.95] drop-shadow-lg max-w-[85%]"
                      style={{
                        left: `${textPositions.headline.x}%`,
                        top: `${textPositions.headline.y}%`,
                        fontFamily: typographyForModal?.fontFamily || 'Manrope, sans-serif',
                        fontWeight: typographyForModal?.headline?.weight || 800,
                        fontSize: `${(typographyForModal?.headline?.size || 56)}px`,
                        color: typographyForModal?.headline?.color || '#ffffff',
                      }}
                    >
                      {renderHeadlineWithHighlight(creativeText.headline, typographyForModal?.highlight)}
                    </h4>
                  )}
                  {creativeText.support && (
                    <p
                      className="absolute max-w-[85%] leading-tight drop-shadow"
                      style={{
                        left: `${textPositions.support.x}%`,
                        top: `${textPositions.support.y}%`,
                        fontFamily: typographyForModal?.fontFamily || 'Manrope, sans-serif',
                        fontWeight: typographyForModal?.support?.weight || 400,
                        fontSize: `${typographyForModal?.support?.size || 22}px`,
                        color: typographyForModal?.support?.color || '#f5f5f5',
                      }}
                    >
                      {creativeText.support}
                    </p>
                  )}
                  {creativeText.cta && (
                    <span
                      className="absolute inline-flex rounded-xl px-4 py-2.5 uppercase shadow-lg"
                      style={{
                        left: `${textPositions.cta.x}%`,
                        top: `${textPositions.cta.y}%`,
                        fontFamily: typographyForModal?.fontFamily || 'Manrope, sans-serif',
                        fontWeight: typographyForModal?.cta?.weight || 700,
                        fontSize: `${typographyForModal?.cta?.size || 16}px`,
                        color: typographyForModal?.cta?.color || '#0a0b10',
                        backgroundColor: typographyForModal?.cta?.bgColor || '#10b981',
                      }}
                    >
                      {creativeText.cta}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDownloadPreview(0)}
                  disabled={downloadingPreview === 0}
                  className="flex w-full items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  {downloadingPreview === 0 ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  Baixar criativo em PNG
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-300">{outputModal.output as string}</p>
            )}
          </div>
        </div>
      )}

      {/* MODAL COLAR MULTIPLAS COPYS */}
      {pasteModal && (
        <PasteMultipleCopiesModal
          blockId={pasteModal.blockId}
          onClose={() => setPasteModal(null)}
          onApply={(items) => {
            setBlocks((prev) =>
              prev.map((b) =>
                b.id === pasteModal.blockId
                  ? { ...b, data: { ...b.data, items } }
                  : b
              )
            );
            setPasteModal(null);
          }}
          currentItems={
            blocks.find((b) => b.id === pasteModal.blockId)?.data?.items || []
          }
        />
      )}
    </div>
  );
};

// =============================================================
// PASTE MULTIPLE COPIES MODAL (colar várias linhas de uma vez)
// =============================================================
interface CopyItem {
  id: string;
  headline: string;
  support: string;
  cta?: string;
  visualPrompt?: string;
}

interface PasteMultipleCopiesModalProps {
  blockId: string;
  currentItems: CopyItem[];
  onApply: (items: CopyItem[]) => void;
  onClose: () => void;
}

const PasteMultipleCopiesModal: React.FC<PasteMultipleCopiesModalProps> = ({
  currentItems,
  onApply,
  onClose,
}) => {
  const [text, setText] = useState(() => {
    // Pre-preencher com os itens atuais no formato Headline | Destaque (| CTA opcional) por linha
    return currentItems
      .filter((it) => it.headline || it.support || it.cta)
      .map((it) => `${it.headline} | ${it.support}${it.cta ? ` | ${it.cta}` : ''}`)
      .join('\n');
  });

  const [parsed, setParsed] = useState<CopyItem[]>([]);

  const parseCopies = () => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const items: CopyItem[] = lines.map((line, i) => {
      const parts = line.split('|').map((p) => p.trim());
      return {
        id: `copy-pasted-${Date.now()}-${i}`,
        headline: parts[0] || '',
        support: parts[1] || '',
        cta: parts[2] || '',
      };
    });
    return items;
  };

  const handlePreview = () => {
    const items = parseCopies();
    setParsed(items);
  };

  const handleApply = () => {
    const items = parsed.length > 0 ? parsed : parseCopies();
    if (items.length === 0) {
      alert('Cole ao menos uma copy antes de aplicar.');
      return;
    }
    if (items.length > 12) {
      alert('Limite máximo de 12 copys por bloco.');
      return;
    }
    onApply(items);
  };

  const itemsToShow = parsed.length > 0 ? parsed : parseCopies();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0d0f17] border border-yellow-500/30 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              📋 Colar Múltiplas Copys
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Uma copy por linha. Use <code className="text-yellow-300">Headline | Destaque</code> (CTA opcional, ex: <code className="text-yellow-300">| CTA</code>).
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5">
            <X size={20} />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Headline 1 | Destaque 1&#10;Headline 2 | Destaque 2 | CTA opcional&#10;..."
          rows={10}
          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm font-mono focus:border-yellow-400 focus:outline-none resize-y"
        />

        <div className="flex items-center justify-between mt-4 mb-3">
          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
            {itemsToShow.length} copys detectadas (máx 12)
          </span>
          <button
            onClick={handlePreview}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 px-3 py-1 rounded border border-yellow-500/30 hover:bg-yellow-500/10"
          >
            Atualizar Preview
          </button>
        </div>

        <div className="space-y-1 max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2 mb-4">
          {itemsToShow.length === 0 && (
            <p className="text-xs text-gray-500 italic p-3">Nenhuma copy detectada.</p>
          )}
          {itemsToShow.slice(0, 12).map((it, i) => (
            <div key={i} className="px-2 py-1.5 rounded-md bg-white/[0.03] border border-white/5 text-[11px]">
              <span className="font-bold text-yellow-400 mr-2">#{i + 1}</span>
              <span className="font-bold text-white">{it.headline || '(sem headline)'}</span>
              {it.support && <span className="text-gray-400"> · {it.support}</span>}
              {it.cta && <span className="text-emerald-400"> · {it.cta}</span>}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-500 to-amber-500 text-dark-900 hover:opacity-95 transition-all shadow-lg"
          >
            <Check size={16} /> Aplicar {itemsToShow.length} copys
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================
// HELPERS
// =============================

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function getDefaultLabel(type: BlockType): string {
  switch (type) {
    case 'briefing': return 'Briefing';
    case 'logo': return 'Logo';
    case 'expert': return 'Foto Expert';
    case 'reference': return 'Referência';
    case 'style': return 'Estilo';
    case 'typography': return 'Tipografia';
    case 'copies': return 'Copys';
    case 'copy-output': return 'Gerar Copy (4x)';
    case 'image-output': return 'Gerar Imagem';
    case 'variations-output': return '4 Variações';
    case 'batch-output': return 'Lote N';
  }
}

function getDefaultData(type: BlockType): any {
  switch (type) {
    case 'briefing': return { text: '' };
    case 'logo': return { imageUrl: null };
    case 'expert': return { imageUrl: null, preserveIdentity: true };
    case 'reference': return { imageUrl: null, filename: null };
    case 'style': return { tone: '', color: '#10b981' };
    case 'typography': return {
      fontFamily: 'Manrope',
      headline: { weight: '800', size: 56, color: '#ffffff' },
      support:  { weight: '400', size: 22, color: '#f5f5f5' },
      cta:      { weight: '700', size: 14, color: '#0a0b10', bgColor: '#10b981' },
      highlight:    { color: '#fbbf24', underline: true },
    };
    case 'copies': return {
      items: [
        { id: `copy-${Date.now()}-1`, headline: '', support: '', cta: '', visualPrompt: '' },
      ],
    };
    case 'copy-output': return { customPrompt: '', count: 4 };
    case 'batch-output': return { count: 9, useIndividualPrompts: true };
    default: return {};
  }
}

async function generateCopyVariations(
  briefing: string,
  style: any,
  apiKey: string,
  count: number = 4
): Promise<string[]> {
  const res = await fetch('/api/master-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief: briefing,
      type: 'copy',
      apiKey,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Nao foi possivel gerar as variacoes de copy.');
  }

  const lines = String(data.prompt || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\d+[.)-]?|[-*])\s*/, '').trim())
    .filter((line) => line.includes('|'));

  if (lines.length === 0) {
    throw new Error('A IA respondeu em um formato inesperado. Tente gerar novamente.');
  }

  return lines.slice(0, count);
}

async function generateImage(
  prompt: string,
  style: any,
  logoUrl: string | undefined,
  apiKey: string,
  references: string[] = [],
  expertImage: string | null = null,
  expertPreserve: boolean = true
): Promise<string | null> {
  // Enriquece o prompt mencionando que ha referencias visuais
  let identitySuffix = '';
  if (expertImage && expertPreserve) {
    identitySuffix = ' Featuring the same person from the reference photo, preserving facial identity, clothing style and overall mood.';
  }
  const enhancedPrompt = references.length > 0
    ? `${prompt}. Style: ${style?.tone || 'professional'}, colors: ${style?.color || 'emerald'}. This image has ${references.length} visual reference(s) attached - use them as inspiration for style, composition, and mood.${identitySuffix}`
    : `${prompt}. Style: ${style?.tone || 'professional'}, colors: ${style?.color || 'emerald'}.${identitySuffix}`;

  const refList = expertImage
    ? [expertImage, logoUrl, ...references]
    : [logoUrl, ...references];
  const referenceImages = await Promise.all(
    refList
      .filter((value): value is string => Boolean(value))
      .slice(0, 4)
      .map((value) => optimizeImageDataUrl(value, 1280, 0.78))
  );

  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      size: '1024x1024',
      aspectRatio: '1:1',
      provider: 'openai',
      preferredModel: 'auto',
      apiKey,
      ...(referenceImages.length > 0 ? { referenceImages } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Nao foi possivel gerar a imagem.');
  }
  if (!data.imageUrl) {
    throw new Error('O provedor respondeu sem uma imagem.');
  }
  return data.imageUrl;
}
