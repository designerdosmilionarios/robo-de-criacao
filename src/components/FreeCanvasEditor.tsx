import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  Type,
  Image as ImageIcon,
  MousePointer,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Layers,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// Camada (layer) = qualquer elemento arrastavel no canvas
export interface CanvasLayer {
  id: string;
  type: 'text' | 'image';
  content: string; // texto ou data:image/...
  x: number; // posicao em % do canvas
  y: number;
  width?: number;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  rotation?: number;
  opacity?: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
}

interface FreeCanvasEditorProps {
  initialLayers: CanvasLayer[];
  backgroundImage?: string | null;
  canvasAspectRatio: string; // ex: '4/5', '16/9'
  onChange: (layers: CanvasLayer[]) => void;
  localFonts: { family: string }[];
  defaultFontFamily?: string;
}

export const FreeCanvasEditor: React.FC<FreeCanvasEditorProps> = ({
  initialLayers,
  backgroundImage,
  canvasAspectRatio,
  onChange,
  localFonts,
  defaultFontFamily = 'Inter',
}) => {
  const [layers, setLayers] = useState<CanvasLayer[]>(initialLayers);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; layerX: number; layerY: number }>({
    x: 0,
    y: 0,
    layerX: 0,
    layerY: 0,
  });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showLayerPanel, setShowLayerPanel] = useState(true);

  // Notificar o parent quando layers mudam
  useEffect(() => {
    onChange(layers);
  }, [layers, onChange]);

  // Iniciar drag de layer
  const handleLayerMouseDown = (e: React.MouseEvent, layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || layer.locked || !canvasRef.current) return;
    e.stopPropagation();
    setSelectedLayerId(layerId);
    const rect = canvasRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      layerX: layer.x,
      layerY: layer.y,
    };
    setDraggingLayerId(layerId);
  };

  // Drag em tempo real
  useEffect(() => {
    if (!draggingLayerId) return;
    const handleMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = e.clientX - rect.left - dragStartRef.current.x;
      const dy = e.clientY - rect.top - dragStartRef.current.y;
      // Calcula em porcentagem do canvas
      const xPct = ((dragStartRef.current.layerX * rect.width) / 100 + dx) / rect.width * 100;
      const yPct = ((dragStartRef.current.layerY * rect.height) / 100 + dy) / rect.height * 100;
      const clampedX = Math.max(0, Math.min(100, xPct));
      const clampedY = Math.max(0, Math.min(100, yPct));
      setLayers((prev) =>
        prev.map((l) => (l.id === draggingLayerId ? { ...l, x: clampedX, y: clampedY } : l))
      );
    };
    const handleUp = () => setDraggingLayerId(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingLayerId]);

  // Adicionar nova camada de texto
  const addTextLayer = () => {
    const newLayer: CanvasLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'text',
      content: 'Novo texto',
      x: 50,
      y: 50,
      fontSize: 32,
      fontWeight: '700',
      fontFamily: defaultFontFamily,
      color: '#ffffff',
      textAlign: 'center',
      rotation: 0,
      opacity: 1,
      zIndex: layers.length + 1,
      visible: true,
      locked: false,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setEditingLayerId(newLayer.id);
  };

  // Adicionar camada de imagem
  const addImageLayer = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const newLayer: CanvasLayer = {
          id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'image',
          content: reader.result as string,
          x: 50,
          y: 50,
          width: 30,
          rotation: 0,
          opacity: 1,
          zIndex: layers.length + 1,
          visible: true,
          locked: false,
        };
        setLayers((prev) => [...prev, newLayer]);
        setSelectedLayerId(newLayer.id);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Remover camada
  const removeLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // Duplicar camada
  const duplicateLayer = (id: string) => {
    const orig = layers.find((l) => l.id === id);
    if (!orig) return;
    const copy: CanvasLayer = {
      ...orig,
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x: orig.x + 5,
      y: orig.y + 5,
      zIndex: Math.max(...layers.map((l) => l.zIndex)) + 1,
    };
    setLayers((prev) => [...prev, copy]);
    setSelectedLayerId(copy.id);
  };

  // Mover camada para cima/baixo
  const moveLayer = (id: string, direction: 'up' | 'down') => {
    setLayers((prev) => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const swapWith = direction === 'up' ? idx + 1 : idx - 1;
      if (swapWith < 0 || swapWith >= sorted.length) return prev;
      [sorted[idx], sorted[swapWith]] = [sorted[swapWith], sorted[idx]];
      return sorted.map((l, i) => ({ ...l, zIndex: i + 1 }));
    });
  };

  const updateLayer = (id: string, patch: Partial<CanvasLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  return (
    <div className="flex gap-3">
      {/* CANVAS PRINCIPAL */}
      <div className="flex-1 relative">
        <div
          ref={canvasRef}
          onClick={() => setSelectedLayerId(null)}
          className="relative w-full bg-gray-200 overflow-hidden rounded-2xl shadow-2xl border-2 border-white/20"
          style={{ aspectRatio: canvasAspectRatio }}
        >
          {/* Background */}
          {backgroundImage && (
            <img
              src={backgroundImage}
              alt="bg"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          )}

          {/* Layers */}
          {layers
            .filter((l) => l.visible)
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((layer) => {
              const isSelected = selectedLayerId === layer.id;
              const isEditing = editingLayerId === layer.id;
              return (
                <div
                  key={layer.id}
                  onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
                  onDoubleClick={() => setEditingLayerId(layer.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLayerId(layer.id);
                  }}
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                    opacity: layer.opacity ?? 1,
                    cursor: layer.locked ? 'not-allowed' : draggingLayerId === layer.id ? 'grabbing' : 'grab',
                    zIndex: layer.zIndex,
                    width: layer.type === 'image' && layer.width ? `${layer.width}%` : 'auto',
                    maxWidth: '90%',
                  }}
                  className={`absolute ${
                    isSelected ? 'outline outline-2 outline-emerald-400 outline-offset-2' : ''
                  }`}
                >
                  {layer.type === 'text' ? (
                    isEditing ? (
                      <textarea
                        autoFocus
                        value={layer.content}
                        onChange={(e) => updateLayer(layer.id, { content: e.target.value })}
                        onBlur={() => setEditingLayerId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            setEditingLayerId(null);
                          }
                        }}
                        style={{
                          fontSize: `${layer.fontSize}px`,
                          fontWeight: layer.fontWeight as any,
                          fontFamily: layer.fontFamily,
                          color: layer.color,
                          textAlign: layer.textAlign as any,
                        }}
                        className="bg-transparent border-2 border-dashed border-emerald-400 outline-none resize-none min-w-[100px] p-1"
                        rows={Math.max(1, layer.content.split('\n').length)}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: `${layer.fontSize}px`,
                          fontWeight: layer.fontWeight as any,
                          fontFamily: layer.fontFamily,
                          color: layer.color,
                          textAlign: layer.textAlign as any,
                          whiteSpace: 'pre-wrap',
                          textShadow: layer.color?.startsWith('#fff') ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
                        }}
                      >
                        {layer.content}
                      </div>
                    )
                  ) : (
                    <img
                      src={layer.content}
                      alt="layer"
                      className="w-full h-auto"
                      draggable={false}
                    />
                  )}
                </div>
              );
            })}

          {/* Indicador de drag */}
          {draggingLayerId && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-emerald-500 text-white text-xs font-bold animate-pulse pointer-events-none">
              Movendo...
            </div>
          )}
        </div>

        {/* Toolbar embaixo do canvas */}
        <div className="mt-3 flex items-center gap-2 justify-center">
          <button
            onClick={addTextLayer}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
          >
            <Type size={13} /> + Texto
          </button>
          <button
            onClick={addImageLayer}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40"
          >
            <ImageIcon size={13} /> + Imagem
          </button>
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40"
          >
            <Layers size={13} /> Camadas ({layers.length})
          </button>
        </div>
      </div>

      {/* PAINEL LATERAL: CONTROLES + CAMADAS */}
      {showLayerPanel && (
        <div className="w-72 space-y-3">
          {/* CONTROLES DA CAMADA SELECIONADA */}
          {selectedLayer ? (
            <div className="p-4 rounded-2xl bg-[#0e111a] border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  ✏️ Editando camada
                </span>
                <button
                  onClick={() => setSelectedLayerId(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              {selectedLayer.type === 'text' && (
                <>
                  {/* Conteúdo */}
                  <textarea
                    rows={3}
                    value={selectedLayer.content}
                    onChange={(e) => updateLayer(selectedLayer.id, { content: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs resize-none focus:border-brand-500 focus:outline-none"
                  />

                  {/* Fonte */}
                  <select
                    value={selectedLayer.fontFamily}
                    onChange={(e) => updateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px]"
                  >
                    {localFonts.map((f) => (
                      <option key={f.family} value={f.family} className="bg-[#11131a]">
                        {f.family}
                      </option>
                    ))}
                  </select>

                  {/* Tamanho */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span>Tamanho</span>
                      <span>{selectedLayer.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={selectedLayer.fontSize}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Peso */}
                  <select
                    value={selectedLayer.fontWeight}
                    onChange={(e) => updateLayer(selectedLayer.id, { fontWeight: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px]"
                  >
                    {['300', '400', '500', '600', '700', '800', '900'].map((w) => (
                      <option key={w} value={w} className="bg-[#11131a]">
                        Peso {w}
                      </option>
                    ))}
                  </select>

                  {/* Cor */}
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">Cor do texto</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedLayer.color}
                        onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                        className="w-10 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={selectedLayer.color}
                        onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-mono"
                      />
                    </div>
                  </div>

                  {/* Alinhamento */}
                  <div className="grid grid-cols-3 gap-1">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => updateLayer(selectedLayer.id, { textAlign: align })}
                        className={`py-1 rounded text-[10px] font-bold ${
                          selectedLayer.textAlign === align
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {align === 'left' ? '◀' : align === 'center' ? '●' : '▶'}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {selectedLayer.type === 'image' && (
                <div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span>Largura</span>
                    <span>{Math.round(selectedLayer.width || 30)}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={selectedLayer.width || 30}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, { width: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}

              {/* Controles universais */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                  <span>Rotação</span>
                  <span>{selectedLayer.rotation || 0}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={selectedLayer.rotation || 0}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                  <span>Opacidade</span>
                  <span>{Math.round((selectedLayer.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((selectedLayer.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Ações */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10">
                <button
                  onClick={() => moveLayer(selectedLayer.id, 'up')}
                  className="py-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px]"
                  title="Subir camada"
                >
                  <ChevronUp size={11} className="mx-auto" />
                </button>
                <button
                  onClick={() => moveLayer(selectedLayer.id, 'down')}
                  className="py-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px]"
                  title="Descer camada"
                >
                  <ChevronDown size={11} className="mx-auto" />
                </button>
                <button
                  onClick={() => updateLayer(selectedLayer.id, { locked: !selectedLayer.locked })}
                  className={`py-1.5 rounded text-[10px] ${
                    selectedLayer.locked ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                  title="Bloquear posição"
                >
                  {selectedLayer.locked ? <Lock size={11} className="mx-auto" /> : <Unlock size={11} className="mx-auto" />}
                </button>
                <button
                  onClick={() => duplicateLayer(selectedLayer.id)}
                  className="py-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px]"
                  title="Duplicar"
                >
                  <Copy size={11} className="mx-auto" />
                </button>
                <button
                  onClick={() => updateLayer(selectedLayer.id, { visible: !selectedLayer.visible })}
                  className={`py-1.5 rounded text-[10px] ${
                    selectedLayer.visible ? 'bg-white/5 text-white' : 'bg-red-500/20 text-red-400'
                  }`}
                  title="Mostrar/Ocultar"
                >
                  {selectedLayer.visible ? '👁' : '🚫'}
                </button>
                <button
                  onClick={() => removeLayer(selectedLayer.id)}
                  className="py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px]"
                  title="Excluir camada"
                >
                  <Trash2 size={11} className="mx-auto" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#0e111a] border border-white/10 text-center">
              <MousePointer size={20} className="text-gray-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400">
                Clique numa camada para editar<br />ou adicione uma nova abaixo
              </p>
            </div>
          )}

          {/* LISTA DE CAMADAS */}
          <div className="p-4 rounded-2xl bg-[#0e111a] border border-white/10 space-y-2 max-h-96 overflow-y-auto">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              📚 Camadas ({layers.length})
            </h4>
            {layers.length === 0 ? (
              <p className="text-[10px] text-gray-500 italic text-center py-3">
                Nenhuma camada ainda
              </p>
            ) : (
              layers
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`w-full text-left p-2 rounded-lg border transition-colors flex items-center gap-2 ${
                      selectedLayerId === layer.id
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <span className="text-base">
                      {layer.type === 'text' ? '📝' : '🖼'}
                    </span>
                    <span className="flex-1 truncate text-[11px] text-white">
                      {layer.type === 'text' ? layer.content : 'Imagem'}
                    </span>
                    {!layer.visible && <span className="text-[9px]">👁‍🗨</span>}
                    {layer.locked && <Lock size={9} className="text-amber-400" />}
                  </button>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
