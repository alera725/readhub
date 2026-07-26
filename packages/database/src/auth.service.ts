import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@readhub/types";

type Client = SupabaseClient<Database>;

export interface SignUpInput {
  email: string;
  password: string;
  birthDate: string;
  phone: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export async function signUp(supabase: Client, input: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error) throw error;

  // El trigger on_auth_user_created ya creó la fila en profiles (con
  // birth_date/phone en null). Solo se puede completar aquí si signUp
  // devolvió una sesión activa: depende de si el proyecto exige
  // confirmación de email en Supabase Auth. Si no hay sesión, la
  // actualización queda pendiente (RLS exige auth.uid() = id).
  if (data.user && data.session) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ birth_date: input.birthDate, phone: input.phone })
      .eq("id", data.user.id);

    if (profileError) throw profileError;
  }

  return data;
}

export async function signIn(supabase: Client, input: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) throw error;
  return data;
}

export async function getCurrentUser(supabase: Client): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

// Suscribe a los cambios de sesión (login/logout/refresh) y notifica el
// usuario resultante. Devuelve la suscripción para poder desuscribirse.
export function onAuthStateChange(
  supabase: Client,
  onChange: (user: User | null) => void
) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user ?? null);
  });
}

export async function signOut(supabase: Client): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
