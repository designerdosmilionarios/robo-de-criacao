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
} from 'lucide-react';
import { optimizeImageDataUrl } from '@/lib/imageData';
import { toPng } from 'html-to-image';
import saveAs from 'file-saver';

// Tipos de blocos disponiveis no canvas
export type BlockType =
  | 'briefing'
  | 'logo'
  | 'reference'
  | 'style'
  | 'copy-output'
  | 'image-output'
  | 'variations-output';

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
  'copy-output': {
    icon: Hash,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40 hover:border-amber-500',
    bgColor: 'bg-amber-500/5',
    description: 'Gera 4 variações de copy',
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
};

export const FlowCanvas: React.FC<FlowCanvasProps> = ({ apiKey, provider, brand }) => {
  const [blocks, setBlocks] = useState<FlowBlock[]>([]);
  const [connections, setConnections] = useState<FlowConnection[]>([]);
  const [draggingBlock, setDraggingBlock] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [outputModal, setOutputModal] = useState<{ blockId: string; output: any } | null>(null);
  const [creativeText, setCreativeText] = useState({ headline: '', support: '', cta: '' });
  const [downloadingPreview, setDownloadingPreview] = useState<number | null>(null);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [referencesError, setReferencesError] = useState<string | null>(null);
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
    const references = inputBlocks
      .filter((b) => b.type === 'reference' && b.data?.imageUrl)
      .map((b) => b.data.imageUrl as string);

    if (!briefing && (block.type === 'copy-output' || block.type === 'image-output' || block.type === 'variations-output')) {
      alert('Conecte um bloco "Briefing" antes deste bloco de output. Arraste da bolinha direita do Briefing para a esquerda deste bloco.');
      return;
    }

    if (!apiKey.trim()) {
      alert('Configure sua chave OpenAI no botao "API" antes de gerar os criativos.');
      return;
    }

    setGenerating(blockId);
    try {
      if (block.type === 'copy-output') {
        // Gerar 4 variacoes de copy via Mestre dos Prompts
        const variations = await generateCopyVariations(briefing, style, apiKey);
        if (variations[0]) useCopyInCreative(variations[0]);
        setBlocks((prev) =>
          prev.map((b): FlowBlock => (b.id === blockId ? { ...b, output: variations } : b))
        );
        setOutputModal({ blockId, output: variations });
      } else if (block.type === 'image-output' || block.type === 'variations-output') {
        const count = block.type === 'image-output' ? 1 : 4;
        const imageUrls: string[] = [];
        for (let i = 0; i < count; i++) {
          const url = await generateImage(briefing, style, logo, apiKey, references);
          if (url) imageUrls.push(url);
        }
        setBlocks((prev) =>
          prev.map((b): FlowBlock =>
            b.id === blockId ? { ...b, output: imageUrls } : b
          )
        );
        if (block.type === 'image-output' && imageUrls[0]) {
          setOutputModal({ blockId, output: imageUrls[0] });
        } else {
          setOutputModal({ blockId, output: imageUrls });
        }
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setGenerating(null);
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
            onClick={() => handleCreateBlock('logo')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30"
          >
            <ImageIcon size={12} /> Logo
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
      <div className="h-[700px] w-full overflow-auto bg-[#07090e]">
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

                {isOutput && (
                  <div className="min-h-[60px] flex flex-col items-center justify-center bg-black/20 rounded-md">
                    {generating === block.id ? (
                      <div className="flex flex-col items-center gap-1 py-2">
                        <Loader2 size={18} className={`${config.color} animate-spin`} />
                        <span className="text-[9px] text-gray-400">Gerando...</span>
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
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0d0f17] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Resultado Gerado pela IA</h3>
              <button onClick={() => setOutputModal(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {Array.isArray(outputModal.output) ? (
              <div className="grid grid-cols-2 gap-3">
                {outputModal.output.map((out: any, i: number) => (
                  <div key={i} className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                    {typeof out === 'string' && out.startsWith('data:image') ? (
                      <>
                        <div id={`flow-creative-preview-${i}`} className="relative aspect-square overflow-hidden bg-black">
                          <img src={out} alt={`Resultado ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 text-left">
                            {creativeText.headline && <h4 className="text-2xl font-black uppercase leading-[0.95] text-white drop-shadow-lg">{creativeText.headline}</h4>}
                            {creativeText.support && <p className="max-w-[90%] text-sm font-medium leading-tight text-white/90">{creativeText.support}</p>}
                            {creativeText.cta && <span className="inline-flex rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black uppercase text-black">{creativeText.cta}</span>}
                          </div>
                        </div>
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
                ))}
              </div>
            ) : typeof outputModal.output === 'string' && outputModal.output.startsWith('data:image') ? (
              <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <div id="flow-creative-preview-0" className="relative aspect-square overflow-hidden bg-black">
                  <img src={outputModal.output} alt="Resultado" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 space-y-3 p-7 text-left">
                    {creativeText.headline && <h4 className="text-4xl font-black uppercase leading-[0.95] text-white drop-shadow-lg">{creativeText.headline}</h4>}
                    {creativeText.support && <p className="max-w-[90%] text-base font-medium leading-tight text-white/90">{creativeText.support}</p>}
                    {creativeText.cta && <span className="inline-flex rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black uppercase text-black">{creativeText.cta}</span>}
                  </div>
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
    case 'reference': return 'Referência';
    case 'style': return 'Estilo';
    case 'copy-output': return 'Gerar Copy (4x)';
    case 'image-output': return 'Gerar Imagem';
    case 'variations-output': return '4 Variações';
  }
}

function getDefaultData(type: BlockType): any {
  switch (type) {
    case 'briefing': return { text: '' };
    case 'logo': return { imageUrl: null };
    case 'reference': return { imageUrl: null, filename: null };
    case 'style': return { tone: '', color: '#10b981' };
    default: return {};
  }
}

async function generateCopyVariations(
  briefing: string,
  style: any,
  apiKey: string
): Promise<string[]> {
  const res = await fetch('/api/master-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief: `${briefing}. Tom: ${style?.tone || 'profissional'}.`,
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

  return lines.slice(0, 4);
}

async function generateImage(
  prompt: string,
  style: any,
  logoUrl: string | undefined,
  apiKey: string,
  references: string[] = []
): Promise<string | null> {
  // Enriquece o prompt mencionando que ha referencias visuais
  const enhancedPrompt = references.length > 0
    ? `${prompt}. Style: ${style?.tone || 'professional'}, colors: ${style?.color || 'emerald'}. This image has ${references.length} visual reference(s) attached - use them as inspiration for style, composition, and mood.`
    : `${prompt}. Style: ${style?.tone || 'professional'}, colors: ${style?.color || 'emerald'}`;
  const referenceImages = await Promise.all(
    [logoUrl, ...references]
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
