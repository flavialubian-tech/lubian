import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Navegador usado para gerar os PDFs: CHROMIUM_PATH, senão o Chrome ou o Edge já instalados
 * (no Windows 10 o Edge sempre existe). Sem nenhum, fica com o padrão do Playwright.
 */
export function caminhoNavegador(): string | undefined {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const pastasWindows = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean) as string[];
  const candidatos =
    process.platform === 'win32'
      ? [
          ...pastasWindows.map((p) => join(p, 'Google', 'Chrome', 'Application', 'chrome.exe')),
          ...pastasWindows.map((p) => join(p, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
        : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  return candidatos.find((c) => existsSync(c));
}
