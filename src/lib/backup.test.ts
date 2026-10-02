import { describe, expect, it } from 'vitest';
import { backupAtrasado, backupsParaApagar, dataDoBackup, diasEntre, nomeBackup } from './backup';

const dias = (de: string, n: number) =>
  Array.from({ length: n }, (_, i) => nomeBackup(new Date(Date.parse(`${de}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10)));

describe('backup', () => {
  it('reconhece só pastas de backup', () => {
    expect(dataDoBackup('lubian-2026-10-02')).toBe('2026-10-02');
    expect(dataDoBackup('lubian-2026-10-02.zip')).toBeNull();
    expect(dataDoBackup('fotos')).toBeNull();
  });

  it('com poucos backups não apaga nada', () => {
    expect(backupsParaApagar(dias('2026-09-01', 10))).toEqual([]);
  });

  it('mantém 30 diários e o último de cada mês anterior', () => {
    const nomes = [...dias('2026-07-01', 31 + 31 + 30), 'outra-pasta'];
    const apagar = backupsParaApagar(nomes);
    // Ficam os 30 mais recentes (01/09–30/09) + 31/08 e 31/07 (último de cada mês anterior).
    expect(nomes.length - 1 - apagar.length).toBe(32);
    expect(apagar).not.toContain('lubian-2026-07-31');
    expect(apagar).not.toContain('lubian-2026-08-31');
    expect(apagar).toContain('lubian-2026-08-30');
    expect(apagar).not.toContain('outra-pasta');
  });

  it('limita a 12 meses', () => {
    const meses = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
    const apagar = backupsParaApagar(meses.map((m) => nomeBackup(`${m}-10`)), 0, 12);
    expect(apagar).toEqual(['lubian-2025-03-10', 'lubian-2025-02-10', 'lubian-2025-01-10']);
  });

  it('avisa quando o backup está atrasado', () => {
    expect(diasEntre('2026-09-28', '2026-10-02')).toBe(4);
    expect(backupAtrasado(null, '2026-10-02')).toBe(true);
    expect(backupAtrasado('2026-09-29', '2026-10-02')).toBe(false);
    expect(backupAtrasado('2026-09-28', '2026-10-02')).toBe(true);
  });
});
