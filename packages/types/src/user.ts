export type UserRole = "reader" | "writer" | "admin";

// Refleja la tabla `profiles` (1:1 con `auth.users`).
export interface Profile {
  id: string;
  birth_date: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}
