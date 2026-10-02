/** Valor em reais por extenso, como nos recibos: 2050 → "dois mil e cinquenta reais". */

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const ESCALAS: [string, string][] = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];

function ate999(n: number): string {
  if (n === 100) return 'cem';
  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c) partes.push(CENTENAS[c]);
  if (resto < 20) {
    if (resto) partes.push(UNIDADES[resto]);
  } else {
    partes.push(DEZENAS[Math.floor(resto / 10)] + (resto % 10 ? ` e ${UNIDADES[resto % 10]}` : ''));
  }
  return partes.join(' e ');
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero';
  const grupos: number[] = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) grupos.push(x % 1000);

  const partes: { texto: string; valor: number }[] = [];
  grupos.forEach((g, i) => {
    if (!g) return;
    const [singular, plural] = ESCALAS[i];
    const texto = i === 1 && g === 1 ? 'mil' : [ate999(g), g === 1 ? singular : plural].filter(Boolean).join(' ');
    partes.unshift({ texto, valor: g });
  });

  // "dois mil e cinquenta", "dois mil e cem", mas "dois mil cento e cinquenta".
  return partes
    .map((p, i) => {
      if (i === 0) return p.texto;
      const usaE = i === partes.length - 1 && (p.valor < 100 || p.valor % 100 === 0);
      return (usaE ? 'e ' : '') + p.texto;
    })
    .join(' ');
}

export function valorPorExtenso(valor: number): string {
  const totalCentavos = Math.round(valor * 100);
  const reais = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;
  const partes: string[] = [];
  if (reais) {
    const exatoMilhao = reais >= 1_000_000 && reais % 1_000_000 === 0;
    partes.push(`${inteiroPorExtenso(reais)}${exatoMilhao ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  return partes.length ? partes.join(' e ') : 'zero real';
}
