import { networkInterfaces } from 'node:os';

/** Endereços deste computador na rede local (ex.: http://192.168.0.10:3000), para abrir no celular. */
export function enderecosLocais(porta: number | string = process.env.PORT ?? 3000): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'))
    .map((i) => `http://${i!.address}:${porta}`);
}
