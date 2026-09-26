'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  User,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { AuthUser } from '@/types';

interface AuthScreenProps {
  hasRegisteredUser: boolean;
  currentUser: AuthUser | null;
  onLogin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (name: string, email: string, pin: string) => Promise<{ success: boolean }>;
  onResetAccount: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  hasRegisteredUser,
  currentUser,
  onLogin,
  onRegister,
  onResetAccount,
}) => {
  // Se já tem usuário cadastrado, inicia no modo 'login', senão 'register'
  const [isRegistering, setIsRegistering] = useState(!hasRegisteredUser);

  // Campos de registro
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');

  // Campo de login
  const [loginPin, setLoginPin] = useState('');

  // Erros e avisos
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginPin.trim()) {
      setErrorMsg('Digite seu PIN ou senha de acesso.');
      return;
    }

    const res = await onLogin(loginPin);
    if (!res.success) {
      setErrorMsg(res.error || 'Senha incorreta.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regName.trim()) {
      setErrorMsg('Informe seu nome ou nome do estúdio.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Informe um e-mail válido.');
      return;
    }
    if (regPin.length < 4) {
      setErrorMsg('Defina um PIN ou senha de pelo menos 4 dígitos/caracteres.');
      return;
    }
    if (regPin !== regConfirmPin) {
      setErrorMsg('Os PINs digitados não conferem.');
      return;
    }

    await onRegister(regName, regEmail, regPin);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-brand-500 selection:text-black">
      {/* Luzes de fundo / Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Conteúdo Central */}
      <div className="relative w-full max-w-md z-10">
        {/* Logo / Header da Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-500 to-emerald-400 text-dark-900 shadow-xl shadow-brand-500/25 mb-4">
            <Sparkles size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            ROBÔ STUDIO
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">
              v2.0 PRO
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Sua própria esteira de criação sem mensalidades
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-[#0e111a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <span className="text-rose-400 font-bold">●</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODO 1: LOGIN (Se já tem conta cadastrada) */}
          {!isRegistering && hasRegisteredUser ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="text-center pb-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-brand-400 shadow-inner mb-3">
                  {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'RO'}
                </div>
                <h2 className="text-lg font-bold text-white">
                  Bem-vindo de volta, {currentUser?.name || 'Criador'}!
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{currentUser?.email}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  PIN de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <KeyRound size={16} />
                  </div>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Digite seu PIN ou senha..."
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-brand-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-900 font-extrabold text-sm transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                <span>Acessar Estúdio</span>
                <ArrowRight size={16} />
              </button>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="hover:text-brand-400 transition-colors"
                >
                  Novo perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        'Deseja resetar o acesso local deste computador? Você precisará cadastrar um novo perfil.'
                      )
                    ) {
                      onResetAccount();
                      setIsRegistering(true);
                    }
                  }}
                  className="text-gray-500 hover:text-rose-400 transition-colors"
                >
                  Trocar / Resetar
                </button>
              </div>
            </form>
          ) : (
            /* MODO 2: PRIMEIRO ACESSO / CADASTRO DE NOVO USUÁRIO */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <h2 className="text-lg font-bold text-white">Criar Sessão de Acesso</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Cadastre seus dados para proteger suas criações e chaves neste dispositivo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Seu Nome ou Marca
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bruno Designer"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-brand-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Seu E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-brand-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    PIN / Senha
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="4 a 8 dígitos"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-brand-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Confirmar PIN
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repita o PIN"
                    value={regConfirmPin}
                    onChange={(e) => setRegConfirmPin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-brand-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-900 font-extrabold text-sm transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 mt-2"
              >
                <span>Concluir e Entrar no Estúdio</span>
                <ArrowRight size={16} />
              </button>

              {hasRegisteredUser && (
                <div className="pt-3 border-t border-white/10 text-center">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className="text-xs text-gray-400 hover:text-brand-400 transition-colors"
                  >
                    ← Já tenho cadastro, fazer login
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Badge de Privacidade */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Bloqueio local deste navegador — não substitui autenticação de servidor</span>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-gray-500 flex items-center justify-center gap-1.5">
          <HelpCircle size={13} />
          <span>Esqueceu o PIN? Use “Trocar / Resetar” para criar um novo perfil local.</span>
        </div>
      </div>
    </div>
  );
};
