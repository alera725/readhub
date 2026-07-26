// Datos de prueba: credenciales del usuario para los flujos de autenticación.
//
// Por defecto usa un usuario sembrado en supabase/seed.sql (email ya confirmado),
// para que la prueba funcione contra el proyecto sin pasos manuales. Se puede
// sobrescribir con variables de entorno (E2E_EMAIL / E2E_PASSWORD) en otros
// entornos o en CI, sin tocar el código de la prueba.

export interface TestUser {
  email: string;
  password: string;
}

export const testUser: TestUser = {
  // `||` (no `??`) para que un valor vacío (p. ej. un secreto no configurado en
  // CI) también caiga al usuario sembrado por defecto.
  email: process.env.E2E_EMAIL || "carla.reader@readhub.dev",
  password: process.env.E2E_PASSWORD || "ReadHub123!",
};
