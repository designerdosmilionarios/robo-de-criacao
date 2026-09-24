import React, { useState, useEffect } from 'react';
import { SavedProject, SavedProjectType } from '@/types';
import { Save, X, Loader2 } from 'lucide-react';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
  type: SavedProjectType;
  existingId?: string; // se for atualização
}

const TYPE_LABEL: Record<SavedProjectType, string> = {
  carousel: 'Carrossel',
  'single-image': 'Criativo Único',
  pose: 'Pose / Pessoa',
  'batch-ads': 'Lote Meta Ads',
};

export const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName = '',
  type,
  existingId,
}) => {
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    // Pequeno delay para dar feedback visual
    setTimeout(() => {
      onSave(name.trim());
      setSaving(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0d0f17] border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Save size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {existingId ? 'Atualizar Projeto' : 'Salvar Projeto'}
              </h2>
              <p className="text-xs text-gray-400">
                {TYPE_LABEL[type]} • {existingId ? 'sobrescreve a versão anterior' : 'fica salvo na sua biblioteca'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
              Nome do Projeto
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Black Friday - Cliente Ane"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-brand-500 focus:outline-none"
            />
            <p className="text-[11px] text-gray-500 mt-2">
              Use um nome descritivo para encontrar facilmente depois.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-500 to-emerald-400 text-dark-900 hover:opacity-95 transition-all shadow-lg disabled:opacity-40"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save size={14} /> {existingId ? 'Atualizar' : 'Salvar Projeto'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
