"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Home, LogOut, Menu, Sparkles, Upload, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavbarProps {
  user: User | null;
}

const navLinks = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/upload", label: "Cargar artículo", icon: Upload },
  { href: "/assistant", label: "Asistente", icon: Sparkles },
] as const;

export function Navbar({ user: initialUser }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, signOut } = useAuth();

  const user = authUser ?? initialUser;
  const displayName = user?.email ?? "";

  async function handleSignOut() {
    await signOut();
    setIsMenuOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground">
              R
            </span>
            <span className="font-heading text-lg font-semibold tracking-tight">
              ReadHub
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Button
                  key={link.href}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  nativeButton={false}
                  render={<Link href={link.href} className="gap-1.5" />}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {displayName ? (
            <span className="max-w-40 truncate text-sm text-muted-foreground">
              {displayName}
            </span>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-border md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Button
                  key={link.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className="justify-start gap-2"
                  nativeButton={false}
                  render={
                    <Link href={link.href} onClick={() => setIsMenuOpen(false)} />
                  }
                >
                  <Icon className="size-4" />
                  {link.label}
                </Button>
              );
            })}
            <Separator className="my-2" />
            {displayName ? (
              <span className="truncate px-2.5 py-1 text-sm text-muted-foreground">
                {displayName}
              </span>
            ) : null}
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
