'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthUser, AuthSession } from '@/types';

const STORAGE_KEY_USER = 'robo_auth_user';
const STORAGE_KEY_SESSION = 'robo_auth_session';

function createSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const payload = new TextEncoder().encode(`${salt}:${pin.trim()}`);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

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
  const register = useCallback(async (name: string, email: string, pin: string) => {
    const pinSalt = createSalt();
    const pinHash = await hashPin(pin, pinSalt);
    const newUser: AuthUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      pinHash,
      pinSalt,
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
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      const cleanPin = pin.trim();

      if (!currentUser) {
        return { success: false, error: 'Nenhum usuário cadastrado neste dispositivo.' };
      }

      const matchesCurrentHash =
        !!currentUser.pinHash &&
        !!currentUser.pinSalt &&
        (await hashPin(cleanPin, currentUser.pinSalt)) === currentUser.pinHash;
      const matchesLegacyPin = !!currentUser.pin && currentUser.pin === cleanPin;

      if (matchesCurrentHash || matchesLegacyPin) {
        // Migra perfis antigos que ainda guardavam o PIN em texto puro.
        if (matchesLegacyPin) {
          const pinSalt = createSalt();
          const migratedUser: AuthUser = {
            ...currentUser,
            pin: undefined,
            pinSalt,
            pinHash: await hashPin(cleanPin, pinSalt),
          };
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(migratedUser));
          setCurrentUser(migratedUser);
        }
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
