"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import {
  getCurrentUser,
  onAuthStateChange,
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
  type SignInInput,
  type SignUpInput,
} from "@readhub/database";

// Supabase Auth siempre responde en inglés; el resto de la UI está en
// español, así que se traducen los mensajes más frecuentes. Si no hay
// traducción conocida, se muestra el mensaje original (mejor un mensaje en
// inglés que ninguno).
const AUTH_ERROR_TRANSLATIONS: Record<string, string> = {
  "Invalid login credentials": "Correo electrónico o contraseña incorrectos.",
  "Email not confirmed":
    "Debes confirmar tu correo electrónico antes de iniciar sesión.",
  "User already registered":
    "Ya existe una cuenta registrada con este correo electrónico.",
  "Password should be at least 6 characters":
    "La contraseña debe tener al menos 6 caracteres.",
  "Unable to validate email address: invalid format":
    "El formato del correo electrónico no es válido.",
};

function translateAuthError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  return AUTH_ERROR_TRANSLATIONS[err.message] ?? err.message;
}

export interface SignUpResult {
  success: boolean;
  // true si Supabase Auth exige confirmar el email antes de crear sesión
  // (depende de la configuración del proyecto) — sin sesión no hay forma
  // de redirigir a una ruta protegida, así que la pantalla debe mostrar un
  // mensaje distinto en ese caso en vez de navegar a la página principal.
  requiresEmailConfirmation: boolean;
}

interface UseAuthResult {
  user: User | null;
  loading: boolean;
  isSubmitting: boolean;
  error: string | null;
  signIn: (input: SignInInput) => Promise<boolean>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    getCurrentUser(supabase).then((currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = onAuthStateChange(supabase, setUser);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (input: SignInInput): Promise<boolean> => {
    setError(null);
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const data = await signInService(supabase, input);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(translateAuthError(err, "No se pudo iniciar sesión."));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpResult> => {
      setError(null);
      setIsSubmitting(true);
      try {
        const supabase = createClient();
        const data = await signUpService(supabase, input);
        setUser(data.user);
        return { success: true, requiresEmailConfirmation: !data.session };
      } catch (err) {
        setError(translateAuthError(err, "No se pudo completar el registro."));
        return { success: false, requiresEmailConfirmation: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const supabase = createClient();
      await signOutService(supabase);
      setUser(null);
    } catch (err) {
      setError(translateAuthError(err, "No se pudo cerrar sesión."));
    }
  }, []);

  return { user, loading, isSubmitting, error, signIn, signUp, signOut };
}
