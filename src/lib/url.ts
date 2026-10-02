import 'server-only';
import { headers } from 'next/headers';

/** Endereço público do sistema (para os links enviados ao cliente). */
export async function urlBase() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
}
