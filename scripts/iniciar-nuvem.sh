#!/bin/sh
# Início do sistema na nuvem (contêiner): confere a configuração, cria/atualiza o banco e sobe o servidor.
set -e
if [ -z "$DATABASE_URL" ]; then
  echo "ERRO: falta DATABASE_URL (endereço do banco no Supabase). Sem ela os dados seriam perdidos a cada reinício." >&2
  exit 1
fi
if [ -z "$SENHA_INICIAL" ]; then
  echo "ERRO: falta SENHA_INICIAL (senha dos primeiros usuários)." >&2
  exit 1
fi
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SECRET_KEY" ]; then
  echo "AVISO: sem SUPABASE_URL/SUPABASE_SECRET_KEY as fotos e comprovantes ficam no disco do contêiner e se perdem a cada reinício." >&2
fi
# Aplica as migrações e, só na primeira vez, cria empresa, equipe, usuários e serviços.
node_modules/.bin/tsx scripts/db-semear.ts --sem-exemplos
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
