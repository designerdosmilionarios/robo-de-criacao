import React, { useState } from 'react';
import { BrandKit } from '@/types';
import { Palette, Check, Plus, Trash2, Globe, Type } from 'lucide-react';

interface BrandKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: BrandKit[];
  activeBrandId: string;
  onSelectBrand: (id: string) => void;
  onSaveBrand: (brand: BrandKit) => void;
  onDeleteBrand: (id: string) => void;
}

export const BrandKitModal: React.FC<BrandKitModalProps> = ({
  isOpen,
  onClose,
  brands,
  activeBrandId,
  onSelectBrand,
  onSaveBrand,
  onDeleteBrand,
}) => {
  const [editingBrand, setEditingBrand] = useState<BrandKit | null>(null);

  if (!isOpen) return null;

  const currentBrand =
    editingBrand || brands.find((b) => b.id === activeBrandId) || brands[0];

  const handleCreateNew = () => {
    const newBrand: BrandKit = {
      id: `brand-${Date.now()}`,
      name: 'Novo Cliente',
      handle: '@novocliente',
      primaryColor: '#00F59B',
      secondaryColor: '#3B82F6',
      backgroundColor: '#0A0B10',
      cardColor: '#141722',
      textColor: '#FFFFFF',
      accentTextColor: '#94A3B8',
      fontHeadline: 'Plus Jakarta Sans',
      fontBody: 'Inter',
    };
    onSaveBrand(newBrand);
    onSelectBrand(newBrand.id);
    setEditingBrand(newBrand);
  };

  const handleColorChange = (field: keyof BrandKit, value: string) => {
    if (!currentBrand) return;
    const updated = { ...currentBrand, [field]: value };
    setEditingBrand(updated);
    onSaveBrand(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0d0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Palette size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Central de Marcas (Brand Kits)</h2>
              <p className="text-sm text-gray-400">
                Gerencie paletas, tipografia e identidade visual dos seus clientes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LISTA DE CLIENTES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Clientes Cadastrados
              </span>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-500 text-dark-900 hover:bg-brand-400 transition-all"
              >
                <Plus size={14} /> Novo
              </button>
            </div>

            <div className="space-y-2">
              {brands.map((b) => {
                const isActive = b.id === currentBrand.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setEditingBrand(b);
                      onSelectBrand(b.id);
                    }}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isActive
                        ? 'border-brand-500/50 bg-brand-500/10 shadow-lg'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: b.primaryColor }}
                      />
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{b.name}</p>
                        <p className="text-xs text-gray-400">{b.handle}</p>
                      </div>
                    </div>

                    {isActive && <Check size={16} className="text-brand-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* EDITOR DO CLIENTE SELECIONADO */}
          <div className="md:col-span-2 space-y-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
            <div>
              <h3 className="text-base font-bold text-white mb-4">
                Configurações da Marca: {currentBrand.name}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Nome da Marca / Cliente
                  </label>
                  <input
                    type="text"
                    value={currentBrand.name}
                    onChange={(e) => handleColorChange('name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    @ Perfil do Instagram
                  </label>
                  <input
                    type="text"
                    value={currentBrand.handle}
                    onChange={(e) => handleColorChange('handle', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* CORES */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Paleta de Cores
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] text-gray-300 mb-1">Primária (Destaque)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentBrand.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={currentBrand.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="w-20 px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-300 mb-1">Secundária</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentBrand.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={currentBrand.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="w-20 px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-300 mb-1">Fundo (Background)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentBrand.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={currentBrand.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="w-20 px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-300 mb-1">Texto Principal</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentBrand.textColor}
                      onChange={(e) => handleColorChange('textColor', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={currentBrand.textColor}
                      onChange={(e) => handleColorChange('textColor', e.target.value)}
                      className="w-20 px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white uppercase font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* TIPOGRAFIA */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Fontes (Tipografia)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Type size={14} /> Fonte dos Títulos (Headline)
                  </label>
                  <select
                    value={currentBrand.fontHeadline}
                    onChange={(e) => handleColorChange('fontHeadline', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
                  >
                    <option value="Plus Jakarta Sans" className="bg-[#11131a]">Plus Jakarta Sans (Moderno/Tech)</option>
                    <option value="Montserrat" className="bg-[#11131a]">Montserrat (Impacto/Corporativo)</option>
                    <option value="Syne" className="bg-[#11131a]">Syne (Design Brutalista/Ousado)</option>
                    <option value="Inter" className="bg-[#11131a]">Inter (Clean/Minimalista)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Type size={14} /> Fonte do Corpo
                  </label>
                  <select
                    value={currentBrand.fontBody}
                    onChange={(e) => handleColorChange('fontBody', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
                  >
                    <option value="Inter" className="bg-[#11131a]">Inter (Alta legibilidade)</option>
                    <option value="Plus Jakarta Sans" className="bg-[#11131a]">Plus Jakarta Sans</option>
                    <option value="Montserrat" className="bg-[#11131a]">Montserrat</option>
                  </select>
                </div>
              </div>
            </div>

            {brands.length > 1 && (
              <div className="pt-4 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => onDeleteBrand(currentBrand.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Trash2 size={14} /> Excluir Cliente
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-brand-500 text-dark-900 hover:bg-brand-400 transition-all shadow-lg"
          >
            Pronto / Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
