import { test, expect } from "./utils/test";
import { testUser } from "./data/users";

// Flujo del autor: publicar un artículo propio y luego interactuar con él
// (like + comentario). Se combinan en un solo spec porque comentar/dar like
// necesitan un artículo ya existente — publicar uno propio y nuevo en cada
// corrida evita depender de datos sembrados compartidos (repetible, sin
// pisar likes/comentarios de otras corridas). Título único por timestamp.
test.describe("Publicación y engagement", () => {
  test("publica un artículo propio, le da like y lo comenta", async ({
    page,
    loginPage,
    dashboardPage,
    uploadPage,
    articlePage,
  }) => {
    const title = `Prueba E2E ${Date.now()}`;

    // 1. Login.
    await page.goto("/");
    await loginPage.login(testUser);
    await dashboardPage.expectLoaded(testUser.email);

    // 2. Publicar (Flujo 6): título + documento .txt + imagen de portada.
    await uploadPage.goto();
    await uploadPage.publish({ title });
    await uploadPage.expectPublished();

    // 3. El artículo aparece en el listado del Home y se puede abrir.
    await articlePage.openFromHome(title);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // 4. Like (Flujo 7): estado optimista + persistencia real en Supabase.
    await articlePage.toggleLike();
    await articlePage.expectLiked(1);

    // 5. Comentario (Flujo 8): se persiste y aparece en la lista sin recargar.
    const commentText = `Comentario E2E ${Date.now()}`;
    await articlePage.submitComment(commentText);
    await articlePage.expectCommentVisible(commentText);
  });
});
