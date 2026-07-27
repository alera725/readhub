import { test } from "./utils/test";
import { testUser } from "./data/users";

// Flujo 9: el asistente RAG. A diferencia de auth/publish/comment/like, esta
// prueba depende de contenido YA indexado (embeddings existentes) para poder
// recuperar contexto real — usa una de las preguntas sugeridas por la propia
// UI, que apunta a un tema de los artículos sembrados (PostgreSQL). Ejercita
// el pipeline completo: embedding de la consulta → vector search → contexto
// → LLM real (Hugging Face). Requiere OPENAI_API_KEY y HF_TOKEN configurados
// (en CI, como GitHub Secrets) además de las credenciales de Supabase.
test.describe("Asistente (RAG)", () => {
  test("responde con fuentes a una pregunta sobre contenido publicado", async ({
    page,
    loginPage,
    dashboardPage,
    assistantPage,
  }) => {
    await page.goto("/");
    await loginPage.login(testUser);
    await dashboardPage.expectLoaded(testUser.email);

    await assistantPage.goto();
    await assistantPage.ask("¿Qué artículos hay sobre PostgreSQL?");
    await assistantPage.expectAnsweredWithSources();
  });
});
