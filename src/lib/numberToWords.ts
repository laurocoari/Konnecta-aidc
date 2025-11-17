/**
 * Converte um número para extenso em português brasileiro
 */
export function numberToWords(value: number): string {
  const unidades = [
    '',
    'um',
    'dois',
    'três',
    'quatro',
    'cinco',
    'seis',
    'sete',
    'oito',
    'nove',
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ];

  const dezenas = [
    '',
    '',
    'vinte',
    'trinta',
    'quarenta',
    'cinquenta',
    'sessenta',
    'setenta',
    'oitenta',
    'noventa',
  ];

  const centenas = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ];

  if (value === 0) return 'zero';
  if (value < 0) return 'menos ' + numberToWords(Math.abs(value));

  let result = '';

  // Milhões
  if (value >= 1000000) {
    const milhoes = Math.floor(value / 1000000);
    result += convertGroup(milhoes, unidades, dezenas, centenas) + ' milhão';
    if (milhoes > 1) result += 'ões';
    value = value % 1000000;
    if (value > 0) result += ' ';
  }

  // Milhares
  if (value >= 1000) {
    const milhares = Math.floor(value / 1000);
    if (milhares === 1) {
      result += 'mil';
    } else {
      result += convertGroup(milhares, unidades, dezenas, centenas) + ' mil';
    }
    value = value % 1000;
    if (value > 0) result += ' ';
  }

  // Centenas, dezenas e unidades
  if (value > 0) {
    result += convertGroup(value, unidades, dezenas, centenas);
  }

  return result.trim();
}

function convertGroup(
  value: number,
  unidades: string[],
  dezenas: string[],
  centenas: string[]
): string {
  if (value === 0) return '';
  if (value === 100) return 'cem';

  let result = '';

  // Centenas
  const c = Math.floor(value / 100);
  if (c > 0) {
    result += centenas[c];
    value = value % 100;
    if (value > 0) result += ' e ';
  }

  // Dezenas e unidades
  if (value < 20) {
    result += unidades[value];
  } else {
    const d = Math.floor(value / 10);
    const u = value % 10;
    result += dezenas[d];
    if (u > 0) result += ' e ' + unidades[u];
  }

  return result;
}

/**
 * Converte um valor monetário para extenso
 * Exemplo: 1234.56 -> "um mil duzentos e trinta e quatro reais e cinquenta e seis centavos"
 */
export function currencyToWords(value: number): string {
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);

  let result = '';

  if (reais > 0) {
    result += numberToWords(reais);
    result += reais === 1 ? ' real' : ' reais';
  }

  if (centavos > 0) {
    if (reais > 0) result += ' e ';
    result += numberToWords(centavos);
    result += centavos === 1 ? ' centavo' : ' centavos';
  }

  if (result === '') result = 'zero reais';

  return result;
}



