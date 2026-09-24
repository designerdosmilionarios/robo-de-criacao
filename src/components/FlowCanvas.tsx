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
  Save,
  Copy,
  Loader2,
  Check,
  Zap,
  Hash,
} from 'lucide-react';

// Tipos de blocos disponiveis no canvas
export type BlockType =
  | 'briefing'
  | 'logo'
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
  output?: string; // texto gerado pela IA (para blocos de output)
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
  const [generating, setGenerating] = useState<string | null>(null);
  const [outputModal, setOutputModal] = useState<{ blockId: string; output: any } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
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

  // Iniciar drag de bloco
  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
    if (connecting) return;
    if ((e.target as HTMLElement).closest('button')) return; // nao arrastar ao clicar em botoes
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

  // Conectar blocos
  const handleConnectClick = (blockId: string) => {
    if (!connecting) {
      setConnecting(blockId);
    } else if (connecting !== blockId) {
      // Criar conexão (evitar duplicata)
      const exists = connections.some((c) => c.from === connecting && c.to === blockId);
      if (!exists) {
        setConnections((prev) => [
          ...prev,
          { id: `conn-${Date.now()}`, from: connecting, to: blockId },
        ]);
      }
      setConnecting(null);
    } else {
      // Clicou no mesmo bloco, cancela
      setConnecting(null);
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

    if (!briefing && (block.type === 'copy-output' || block.type === 'image-output' || block.type === 'variations-output')) {
      alert('Conecte um bloco "Briefing" antes deste bloco de output. Arraste da bolinha direita do Briefing para a esquerda deste bloco.');
      return;
    }

    setGenerating(blockId);
    try {
      if (block.type === 'copy-output') {
        // Gerar 4 variacoes de copy via Mestre dos Prompts
        const variations = await generateCopyVariations(briefing, style, apiKey);
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, output: variations } : b))
        );
        setOutputModal({ blockId, output: variations });
      } else if (block.type === 'image-output' || block.type === 'variations-output') {
        const count = block.type === 'image-output' ? 1 : 4;
        const imageUrls: string[] = [];
        for (let i = 0; i < count; i++) {
          const url = await generateImage(briefing, style, logo, apiKey);
          if (url) imageUrls.push(url);
        }
        setBlocks((prev) =>
          prev.map((b) =>
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

  return (
    <div className="w-full bg-[#0a0b10] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* BARRA DE FERRAMENTAS (topo) */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-[#0d0f17] flex-wrap">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pr-2">
          🎨 Canvas de Fluxos (estilo Gravyx)
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

      {/* AREA DO CANVAS (meio) */}
      <div
        ref={canvasRef}
        className="relative w-full h-[700px] overflow-hidden bg-[#07090e]"
        style={{
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
                        handleConnectClick(block.id);
                      }}
                      className={`w-2 h-2 rounded-full ${config.color.replace('text', 'bg')} hover:scale-150 transition-transform`}
                      title="Conectar a outro bloco"
                    />
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
                  <div className="min-h-[60px] flex items-center justify-center bg-black/20 rounded-md">
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
                  </div>
                )}

                {/* Ponto de conexao na esquerda (input) para outputs */}
                {isOutput && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectClick(block.id);
                    }}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0a0b10] hover:scale-125 transition-transform"
                    title="Ponto de entrada - conecte um bloco aqui"
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Status de conexao em progresso */}
        {connecting && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            Clique em outro bloco para conectar (ESC para cancelar)
          </div>
        )}
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
                  <div key={i} className="rounded-xl border border-white/10 overflow-hidden">
                    {typeof out === 'string' && out.startsWith('data:image') ? (
                          <img src={out} alt={`Resultado ${i + 1}`} className="w-full" />
                        ) : (
                          <div className="p-3 bg-black/30">
                            <p className="text-xs text-gray-300">{typeof out === 'string' ? out : JSON.stringify(out, null, 2)}</p>
                          </div>
                        )}
                  </div>
                ))}
              </div>
            ) : typeof outputModal.output === 'string' && outputModal.output.startsWith('data:image') ? (
              <img src={outputModal.output} alt="Resultado" className="w-full" />
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

function getDefaultLabel(type: BlockType): string {
  switch (type) {
    case 'briefing': return 'Briefing';
    case 'logo': return 'Logo';
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
    case 'style': return { tone: '', color: '#10b981' };
    default: return {};
  }
}

async function generateCopyVariations(
  briefing: string,
  style: any,
  apiKey: string
): Promise<string[]> {
  // Usa o Mestre dos Prompts para gerar 4 variacoes de copy
  try {
    const res = await fetch('/api/master-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: `Gere 4 variacoes de copy (headline, destaque, CTA) para um anuncio. Briefing: ${briefing}. Tom: ${style?.tone || 'profissional'}. Retorne 4 linhas separadas por | no formato: HEADLINE | DESTAQUE | CTA`,
        apiKey,
      }),
    });
    const data = await res.json();
    if (data.prompt) {
      // Quebrar por linha ou por |
      const lines = data.prompt.split(/\n|\|/).filter((l: string) => l.trim().length > 10);
      return lines.slice(0, 4);
    }
    return ['Use o Mestre dos Prompts para gerar copy'];
  } catch (e) {
    return ['Erro ao gerar copy'];
  }
}

async function generateImage(
  prompt: string,
  style: any,
  logoUrl: string | undefined,
  apiKey: string
): Promise<string | null> {
  try {
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `${prompt}. Style: ${style?.tone || 'professional'}, colors: ${style?.color || 'emerald'}`,
        size: '1024x1024',
        aspectRatio: '1:1',
        provider: 'openai',
        preferredModel: 'auto',
        apiKey,
        ...(logoUrl ? { imageBase64: logoUrl.replace(/^data:image\/\w+;base64,/, '') } : {}),
      }),
    });
    const data = await res.json();
    if (data.imageUrl) return data.imageUrl;
    return null;
  } catch (e) {
    return null;
  }
}
