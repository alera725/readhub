"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FormField } from "@/components/forms/form-field";
import { Spinner } from "@/components/ui/spinner";

// Tras un registro exitoso con sesión activa, se muestra la confirmación
// brevemente antes de redirigir (Flujo 2: "mensaje de éxito y accede a la
// página principal").
const SUCCESS_REDIRECT_DELAY_MS = 1500;

type ViewState = "form" | "redirecting" | "needs-email-confirmation";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isSubmitting, error } = useAuth();

  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [viewState, setViewState] = useState<ViewState>("form");

  useEffect(() => {
    if (viewState !== "redirecting") return;

    const timeout = setTimeout(() => {
      router.push("/");
      router.refresh();
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [viewState, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await signUp({ email, password, birthDate, phone });

    if (!result.success) {
      setPassword("");
      return;
    }

    setViewState(
      result.requiresEmailConfirmation ? "needs-email-confirmation" : "redirecting"
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>
          Completa tus datos para unirte a ReadHub.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>No se pudo completar el registro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {viewState === "redirecting" ? (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>¡Registro exitoso!</AlertTitle>
              <AlertDescription>
                Redirigiendo a la página principal...
              </AlertDescription>
            </Alert>
          ) : null}

          {viewState === "needs-email-confirmation" ? (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>¡Registro exitoso!</AlertTitle>
              <AlertDescription>
                Revisa tu correo electrónico para confirmar tu cuenta antes de
                iniciar sesión.
              </AlertDescription>
            </Alert>
          ) : null}

          {viewState === "form" ? (
            <>
              <FormField label="Correo electrónico" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                label="Fecha de nacimiento"
                htmlFor="birthDate"
                required
              >
                <Input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  autoComplete="bday"
                  required
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField label="Número celular" htmlFor="phone" required>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField label="Contraseña" htmlFor="password" required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                />
              </FormField>
            </>
          ) : null}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {viewState === "form" ? (
            <>
              <Button
                type="submit"
                className="w-full gap-1.5"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Spinner /> : null}
                Registrarse
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Inicia sesión
                </Link>
              </p>
            </>
          ) : null}

          {viewState === "needs-email-confirmation" ? (
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Ir a iniciar sesión
            </Button>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  );
}
