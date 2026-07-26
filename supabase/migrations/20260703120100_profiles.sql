-- Entidad PROFILES: representa a todos los usuarios registrados en la plataforma.
-- Relación uno a uno con auth.users, usando el mismo UUID como PK y FK.

create type public.user_role as enum ('reader', 'writer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  birth_date date,
  phone text,
  role public.user_role not null default 'reader',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Usuarios registrados en la plataforma. 1:1 con auth.users.';
comment on column public.profiles.id is 'Mismo UUID que auth.users.id.';
comment on column public.profiles.role is 'reader, writer o admin.';

-- Crea automáticamente el perfil correspondiente cuando se registra un usuario en auth.users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
