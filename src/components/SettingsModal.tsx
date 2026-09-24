import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, ExternalLink, Save, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  openaiApiKey: string;
  claudeApiKey: string;
  provider: 'openai' | 'Opus 4.8';
  onSaveApiKey: (key: string, provider: 'openai' | 'Opus 4.8') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  openaiApiKey,
  claudeApiKey,
  provider,
  onSaveApiKey,
}) => {
  const [activeProvider, setActiveProvider] = useState<'openai' | 'Opus 4.8'>(provider);
  const [keyInput, setKeyInput] = useState(provider === 'openai' ? openaiApiKey : claudeApiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setKeyInput(activeProvider === 'openai' ? openaiApiKey : claudeApiKey);
  }, [activeProvider, openaiApiKey, claudeApiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim(), activeProvider);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#0d0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Key size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Chaves de API</h2>
              <p className="text-sm text-gray-400">
                Conecte sua chave para gerar imagens e roteiros com IA.
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

        <div className="space-y-6">
          {/* Seletor de Provider - apenas 2 opcoes (sem Anthropic) */}
          <div>
            <span className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
              Provedor de IA
            </span>
            <div className="inline-flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
              <button
                onClick={() => setActiveProvider('Opus 4.8')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeProvider === 'Opus 4.8' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Opus 4.8 Opus 4.8 Studio
              </button>
              <button
                onClick={() => setActiveProvider('openai')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeProvider === 'openai' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                OpenAI
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck size={16} />
              <span>Privacidade Total & Armazenamento Local</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Sua chave fica gravada apenas no seu navegador. Nada é enviado para servidores de terceiros.
            </p>
          </div>

          {/* Input da Chave */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                {activeProvider === 'Opus 4.8' ? 'Chave Opus 4.8 Studio (Opus 4.8)' : 'OpenAI API Key'}
              </label>
              <a
                href={
                  activeProvider === 'Opus 4.8'
                    ? 'https://Opus 4.8/app/apikey'
                    : 'https://platform.openai.com/api-keys'
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-brand-400 hover:underline"
              >
                Pegar chave aqui <ExternalLink size={12} />
              </a>
            </div>
            <input
              type="password"
              placeholder={activeProvider === 'Opus 4.8' ? 'AIzaSy...' : 'sk-proj-...'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm font-mono focus:border-brand-500 focus:outline-none"
            />
            <p className="text-[11px] text-gray-500 mt-2">
              {activeProvider === 'Opus 4.8'
                ? 'Use a mesma chave do Opus 4.8 Studio (Opus 4.8). Suporta Nano Banana Pro para imagens.'
                : 'Dica: você paga centavos por imagem gerada com DALL-E 3 ou GPT Image.'}
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-brand-500 text-dark-900 hover:bg-brand-400 transition-all shadow-lg"
            >
              {savedSuccess ? (
                <>
                  <Check size={16} /> Salvo!
                </>
              ) : (
                <>
                  <Save size={16} /> Salvar Chave
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
