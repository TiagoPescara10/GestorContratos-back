const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function centenas(n) {
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const parteC = c ? CENTENAS[c] : '';
  const parteResto = resto < 20
    ? UNIDADES[resto]
    : DECENAS[Math.floor(resto / 10)] + (resto % 10 ? ' Y ' + UNIDADES[resto % 10] : '');
  return [parteC, parteResto].filter(Boolean).join(' ');
}

function miles(n) {
  if (n === 0) return '';
  const m = Math.floor(n / 1000);
  const resto = n % 1000;
  let parteM = '';
  if (m === 1) parteM = 'MIL';
  else if (m > 1) parteM = centenas(m) + ' MIL';
  const parteResto = resto > 0 ? centenas(resto) : '';
  return [parteM, parteResto].filter(Boolean).join(' ');
}

function millones(n) {
  if (n === 0) return 'CERO';
  const mill = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  let parteMill = '';
  if (mill === 1) parteMill = 'UN MILLÓN';
  else if (mill > 1) parteMill = centenas(mill) + ' MILLONES';
  const parteResto = resto > 0 ? miles(resto) : '';
  return [parteMill, parteResto].filter(Boolean).join(' ');
}

export function montoALetras(monto) {
  const entero = Math.round(Number(monto));
  return millones(entero);
}
