'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthUser, AuthSession } from '@/types';

const STORAGE_KEY_USER = 'robo_auth_user';
const STORAGE_KEY_SESSION = 'robo_auth_session';

// Senha mestra inicial de contingência caso o usuário precise de acesso emergencial
const MASTER_PIN = 'robo2026';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession>({ isLoggedIn: false, user: null });
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar do localStorage ao iniciar
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY_USER);
      const storedSession = localStorage.getItem(STORAGE_KEY_SESSION);

      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }

      if (storedSession) {
        const parsedSession: AuthSession = JSON.parse(storedSession);
        setSession(parsedSession);
      }
    } catch (e) {
      console.error('Erro ao ler dados de autenticação:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Cadastrar novo usuário (primeiro acesso)
  const register = useCallback((name: string, email: string, pin: string) => {
    const newUser: AuthUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      pin: pin.trim(),
      role: 'Criador Pro',
      createdAt: new Date().toISOString(),
    };

    const newSession: AuthSession = {
      isLoggedIn: true,
      user: {
        name: newUser.name,
        email: newUser.email,
      },
      loggedInAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));

    setCurrentUser(newUser);
    setSession(newSession);
    return { success: true };
  }, []);

  // Login com PIN / Senha
  const login = useCallback(
    (pin: string): { success: boolean; error?: string } => {
      const cleanPin = pin.trim();

      // Permitir PIN mestre
      if (cleanPin === MASTER_PIN) {
        const userFallback = currentUser || {
          name: 'Usuário Pro',
          email: 'usuario@robostudio.pro',
          pin: MASTER_PIN,
          role: 'Administrador',
          createdAt: new Date().toISOString(),
        };

        const newSession: AuthSession = {
          isLoggedIn: true,
          user: {
            name: userFallback.name,
            email: userFallback.email,
          },
          loggedInAt: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
        if (!currentUser) {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userFallback));
          setCurrentUser(userFallback);
        }
        setSession(newSession);
        return { success: true };
      }

      if (!currentUser) {
        return { success: false, error: 'Nenhum usuário cadastrado neste dispositivo.' };
      }

      if (currentUser.pin === cleanPin) {
        const newSession: AuthSession = {
          isLoggedIn: true,
          user: {
            name: currentUser.name,
            email: currentUser.email,
          },
          loggedInAt: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
        setSession(newSession);
        return { success: true };
      }

      return { success: false, error: 'Senha / PIN incorreto.' };
    },
    [currentUser]
  );

  // Logout (bloquear sessão)
  const logout = useCallback(() => {
    const closedSession: AuthSession = {
      isLoggedIn: false,
      user: null,
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(closedSession));
    setSession(closedSession);
  }, []);

  // Reset de conta (limpar para registrar outro usuário)
  const resetAccount = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    setCurrentUser(null);
    setSession({ isLoggedIn: false, user: null });
  }, []);

  return {
    isLoaded,
    hasRegisteredUser: !!currentUser,
    currentUser,
    isAuthenticated: session.isLoggedIn,
    sessionUser: session.user,
    register,
    login,
    logout,
    resetAccount,
  };
}
