export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary font-heading text-lg font-semibold text-primary-foreground">
          R
        </span>
        <span className="font-heading text-xl font-semibold tracking-tight">
          ReadHub
        </span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
