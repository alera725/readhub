-- Habilita pgvector: tipo `vector` + operadores de distancia (coseno, L2,
-- producto interno) e índices ANN (HNSW/IVFFlat). Base para todo el
-- almacenamiento y la búsqueda semántica del sistema RAG.
--
-- Se instala en el schema `extensions`, igual que pgcrypto
-- (ver 20260703120000_extensions.sql), siguiendo la convención de Supabase
-- de mantener las extensiones fuera de `public`. Por eso el tipo se referencia
-- como `extensions.vector(...)` y las funciones que usan sus operadores
-- incluyen `extensions` en su search_path.
create extension if not exists vector with schema extensions;
