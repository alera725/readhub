import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@readhub/database";
import { Navbar } from "@/components/layout/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  // Defensa adicional: el middleware ya redirige antes de llegar aquí, pero
  // el layout no debe depender únicamente de esa capa para considerarse protegido.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
