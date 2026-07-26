-- Bucket de Storage "media": documentos e imágenes de portada de artículos.
-- Privado (no público): la visibilidad de cada archivo depende de si el
-- artículo asociado es público, igual que la tabla `articles`. Convención
-- de rutas: {auth.uid()}/{article_id}/document.<ext> y
-- {auth.uid()}/{article_id}/cover.<ext> — el primer segmento de carpeta
-- identifica al dueño (permite políticas simples de escritura), el segundo
-- identifica el artículo (permite políticas de lectura pública acotada).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  10485760, -- 10 MB
  array[
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
);

-- INSERT/UPDATE/DELETE: solo dentro de la propia carpeta ({auth.uid()}/...).
create policy "media: insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "media: update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "media: delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: el propio dueño, o cualquier autenticado si el artículo (segundo
-- segmento de carpeta = article_id) es público, propio o si es admin —
-- mismo criterio que las funciones de conteo de la migración anterior.
create policy "media: select own or public article"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.articles
      where id::text = (storage.foldername(name))[2]
        and (is_public = true or author_id = auth.uid() or public.is_admin())
    )
  )
);
