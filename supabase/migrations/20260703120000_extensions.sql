-- Extensiones requeridas por el esquema.
-- pgcrypto provee gen_random_uuid() para las claves primarias UUID.
create extension if not exists "pgcrypto" with schema extensions;
