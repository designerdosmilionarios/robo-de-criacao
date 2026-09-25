'use client';

import React, { useState } from 'react';
import {
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  DollarSign,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';

interface ApiKeyGuideProps {
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onOpenSettingsModal?: () => void;
}

export const ApiKeyGuide: React.FC<ApiKeyGuideProps> = ({
  apiKey,
  onSaveApiKey,
  onOpenSettingsModal,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid' | 'no-quota'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleTestKey = async () => {
    const keyToTest = inputKey.trim() || apiKey.trim();
    if (!keyToTest) {
      setTestingStatus('invalid');
      setTestMessage('Por favor, cole sua chave de API antes de testar.');
      return;
    }

    if (!keyToTest.startsWith('sk-')) {
      setTestingStatus('invalid');
      setTestMessage('A chave parece inválida. Chaves da OpenAI geralmente começam com "sk-" ou "sk-proj-".');
      return;
    }

    setTestingStatus('testing');
    setTestMessage('Conectando à OpenAI para verificar autenticação e modelos...');

    try {
      // Teste leve consultando a lista de modelos da OpenAI
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${keyToTest}`,
        },
      });

      if (res.ok) {
        setTestingStatus('valid');
        setTestMessage('✨ Chave 100% válida e conectada com sucesso à OpenAI! Pronta para criar imagens e roteiros.');
        // Salva automaticamente se estiver válida
        onSaveApiKey(keyToTest);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const code = errorData?.error?.code;
        const msg = errorData?.error?.message || '';

        if (res.status === 401) {
          setTestingStatus('invalid');
          setTestMessage('Chave rejeitada pela OpenAI (401 Unauthorized). Verifique se copiou a chave inteira sem espaços.');
        } else if (res.status === 429 || code === 'insufficient_quota') {
          setTestingStatus('no-quota');
          setTestMessage('Chave autêntica, porém sem créditos pré-pagos disponíveis (Saldo $0). É necessário recarregar a partir de $5 na aba Billing.');
          onSaveApiKey(keyToTest);
        } else {
          setTestingStatus('invalid');
          setTestMessage(`Erro ${res.status}: ${msg || 'Não foi possível validar a chave.'}`);
        }
      }
    } catch (err: any) {
      setTestingStatus('invalid');
      setTestMessage(`Erro de rede ao conectar com api.openai.com: ${err.message || 'Verifique sua conexão de internet.'}`);
    }
  };

  return (
    <div className="space-y-8 max-w-[1500px] 2xl:max-w-[1700px] mx-auto py-2">
      {/* Header do Guia */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0e1220] via-[#0b0e17] to-[#07090e] border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold">
              <Key size={13} />
              <span>GUIA DEFINITIVO OPENAI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Como Criar e Conectar sua API KEY do ChatGPT
            </h1>
            <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
              Tenha sua própria esteira de criação profissional sem pagar mensalidades de R$ 150 a R$ 300 por softwares de terceiros. Você só paga centavos diretamente para a OpenAI pelo que gerar.
            </p>
          </div>

          {/* Card Resumo de Status */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[240px] flex flex-col justify-center">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status Atual da Conexão</span>
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`w-3 h-3 rounded-full ${apiKey ? 'bg-emerald-400 shadow-md shadow-emerald-400/30 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-sm font-bold text-white">
                {apiKey ? 'Chave Conectada' : 'Nenhuma Chave Salva'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-mono truncate">
              {apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'Siga os 4 passos abaixo'}
            </p>
          </div>
        </div>
      </div>

      {/* Box Rápido: Conectar / Testar Chave Diretamente */}
      <div className="p-6 rounded-3xl bg-[#0e111a] border border-brand-500/30 shadow-lg relative">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-2">
          <Zap size={18} className="text-brand-400" />
          Já tem uma chave? Conecte ou Teste aqui
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Cole sua chave da OpenAI e clique em testar. Ela ficará salva no seu navegador com segurança total.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="password"
              placeholder="Cole sua chave aqui (sk-proj-... ou sk-...)"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setTestingStatus('idle');
              }}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm font-mono focus:border-brand-500 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={handleSave}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
          >
            {saveFeedback ? <Check size={14} className="text-emerald-400" /> : null}
            <span>{saveFeedback ? 'Salva!' : 'Salvar no Navegador'}</span>
          </button>
          <button
            onClick={handleTestKey}
            disabled={testingStatus === 'testing'}
            className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-900 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {testingStatus === 'testing' ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Testando...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Testar Conexão</span>
              </>
            )}
          </button>
        </div>

        {/* Retorno do Teste */}
        {testingStatus !== 'idle' && (
          <div
            className={`mt-4 p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 animate-in fade-in ${
              testingStatus === 'valid'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : testingStatus === 'no-quota'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            {testingStatus === 'valid' ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <span className="font-bold block">
                {testingStatus === 'valid'
                  ? 'Conexão Aprovada!'
                  : testingStatus === 'no-quota'
                  ? 'Chave Válida, mas Sem Créditos (Saldo $0)'
                  : 'Falha na Validação'}
              </span>
              <span>{testMessage}</span>
              {testingStatus === 'no-quota' && (
                <div className="pt-2">
                  <a
                    href="https://platform.openai.com/settings/organization/billing/overview"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-dark-900 font-extrabold text-[11px]"
                  >
                    Adicionar $5 na OpenAI agora <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ALERTA CRUCIAL: ChatGPT Plus vs API da OpenAI */}
      <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
        <div className="flex items-start gap-3">
          <Info size={22} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2 text-xs sm:text-sm">
            <h4 className="font-extrabold text-amber-300 text-base">
              ⚠️ ATENÇÃO: ChatGPT Plus ($20/mês) NÃO é a mesma coisa que a API
            </h4>
            <p className="leading-relaxed text-amber-200/90">
              Muitos usuários assinam o ChatGPT Plus na web (Opus 4.8) e acham que podem usar no Robô Studio.
              <strong> A API da OpenAI funciona em uma plataforma separada (platform.openai.com).</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-rose-400 font-bold block mb-1">❌ ChatGPT Plus ($20/mês)</span>
                <span className="text-[12px] text-gray-400">
                  Funciona apenas para bater papo na interface web. Não gera chave para aplicativos ou robôs de design.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/30">
                <span className="text-emerald-400 font-bold block mb-1">✅ OpenAI API Platform (Pré-paga)</span>
                <span className="text-[12px] text-gray-300">
                  Você recarrega a partir de <strong>$5 dólares</strong> (cerca de R$ 28) e gera centenas de criativos pagando centavos por uso.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OS 4 PASSOS DETALHADOS */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Passo a Passo Visual para Criar sua Chave</span>
        </h2>

        {/* PASSO 1 */}
        <div className="p-6 2xl:p-7 rounded-3xl bg-[#0e111a] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row gap-6 2xl:gap-8 items-start">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-black text-lg shrink-0">
            1
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-bold text-white">Acesse o Portal de Desenvolvedores da OpenAI</h3>
              <a
                href="https://platform.openai.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-bold transition-all"
              >
                Abrir platform.openai.com <ExternalLink size={13} />
              </a>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Entre em <strong>platform.openai.com</strong> e faça login com a mesma conta que você já usa no Opus 4.8, Microsoft ou crie uma nova conta gratuita.
            </p>
          </div>
        </div>

        {/* PASSO 2 */}
        <div className="p-6 2xl:p-7 rounded-3xl bg-[#0e111a] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row gap-6 2xl:gap-8 items-start">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-black text-lg shrink-0">
            2
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-bold text-white">Adicione Créditos de Saldo Pré-Pago ($5)</h3>
              <a
                href="https://platform.openai.com/settings/organization/billing/overview"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-bold transition-all"
              >
                Ir para Faturamento (Billing) <ExternalLink size={13} />
              </a>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Vá em <strong>Settings &gt; Billing</strong> (ou use o botão acima). Clique em <strong>"Add payment details"</strong> e coloque um saldo mínimo de <strong>$5.00 dólares</strong>.
            </p>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400">
              💡 <strong>Dica Pro:</strong> Com $5 dólares você gera centenas de criativos e dezenas de variações com GPT Image e roteiros com IA.
            </div>
          </div>
        </div>

        {/* PASSO 3 */}
        <div className="p-6 2xl:p-7 rounded-3xl bg-[#0e111a] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row gap-6 2xl:gap-8 items-start">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-black text-lg shrink-0">
            3
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-bold text-white">Crie sua Chave de API Secreta (API Key)</h3>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-bold transition-all"
              >
                Página de API Keys <ExternalLink size={13} />
              </a>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              No menu lateral esquerdo, clique em <strong>API Keys</strong> (ou no botão acima). Depois clique no botão verde <strong>"+ Create new secret key"</strong>.
            </p>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li>Coloque um nome como: <code className="text-brand-400">Robo Studio</code></li>
              <li>Deixe as permissões como <strong>All permissions</strong> (ou padrão)</li>
              <li>Clique em <strong>Create secret key</strong></li>
            </ul>
          </div>
        </div>

        {/* PASSO 4 */}
        <div className="p-6 2xl:p-7 rounded-3xl bg-[#0e111a] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row gap-6 2xl:gap-8 items-start">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-black text-lg shrink-0">
            4
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-base font-bold text-white">Copie a Chave e Cole no Robô Studio</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              A OpenAI exibirá a chave uma única vez (ela começa com <code className="text-brand-400">sk-proj-...</code>). Clique em copiar, volte a esta página, cole no campo de teste no topo e clique em <strong>Testar Conexão</strong>!
            </p>
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <ShieldCheck size={16} />
              <span>Pronto! A chave fica salva no seu navegador e você pode gerar suas artes livremente.</span>
            </div>
          </div>
        </div>
      </div>

      {/* DÚVIDAS FREQUENTES (FAQ) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0e111a] border border-white/10 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <HelpCircle size={18} className="text-brand-400" />
          Perguntas Frequentes (FAQ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <h4 className="text-xs font-bold text-white">Quanto custa cada imagem gerada?</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Depende do modelo escolhido na OpenAI. Imagens com GPT Image ou DALL-E variam entre $0.02 a $0.04 centavos de dólar. 100 imagens custam cerca de $2 a $4 dólares.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <h4 className="text-xs font-bold text-white">Minha chave fica salva em algum servidor?</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Não! A sua chave de API fica armazenada exclusivamente no armazenamento local (localStorage) do seu navegador. Ela é enviada diretamente para a OpenAI no momento da geração.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <h4 className="text-xs font-bold text-white">O que significa o erro "Insufficient Quota" (429)?</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Significa que sua conta da OpenAI está sem saldo de créditos pré-pagos. Basta entrar em <em>Billing</em> na OpenAI e recarregar $5 dólares.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <h4 className="text-xs font-bold text-white">Posso usar a mesma chave em outro computador?</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Sim! Basta abrir o Robô Studio no outro computador e colar a mesma chave. Você pode criar chaves separadas na OpenAI para acompanhar os gastos de cada máquina se preferir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
