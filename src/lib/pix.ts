/**
 * Simulated Pix helpers.
 *
 * Nothing here talks to a bank, a PSP or a gateway. The "Copia e Cola" string is shaped like a
 * real EMV/BR Code payload purely so the checkout looks authentic, and the QR code is a decorative
 * placeholder — scanning it will not move money.
 */

const PIX_SIMULATION_TAG = 'SIMULACAO';

interface PixPayloadInput {
  pixKey: string;
  merchantName: string;
  city: string;
  amount: number;
  reference: string;
}

/** Builds a mock EMV-style "Copia e Cola" string. Structurally plausible, deliberately not payable. */
export const buildSimulatedPixPayload = ({
  pixKey,
  merchantName,
  city,
  amount,
  reference,
}: PixPayloadInput): string => {
  const sanitize = (value: string, maxLength: number) =>
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .slice(0, maxLength);

  const segments = [
    '00020126',
    `BR.GOV.BCB.PIX01${String(pixKey.length).padStart(2, '0')}${pixKey}`,
    '52040000',
    '5303986',
    `54${String(amount.toFixed(2).length).padStart(2, '0')}${amount.toFixed(2)}`,
    '5802BR',
    `59${String(sanitize(merchantName, 25).length).padStart(2, '0')}${sanitize(merchantName, 25)}`,
    `60${String(sanitize(city, 15).length).padStart(2, '0')}${sanitize(city, 15)}`,
    `62${String(reference.length + 4).padStart(2, '0')}05${String(reference.length).padStart(2, '0')}${reference}`,
    `6304${PIX_SIMULATION_TAG}`,
  ];

  return segments.join('');
};

/** Deterministic 32-bit hash, so the same booking always renders the same placeholder pattern. */
const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const MODULE_COUNT = 25;
const FINDER_SIZE = 7;

const isFinderArea = (row: number, col: number): boolean => {
  const inTopLeft = row < FINDER_SIZE + 1 && col < FINDER_SIZE + 1;
  const inTopRight = row < FINDER_SIZE + 1 && col >= MODULE_COUNT - FINDER_SIZE - 1;
  const inBottomLeft = row >= MODULE_COUNT - FINDER_SIZE - 1 && col < FINDER_SIZE + 1;
  return inTopLeft || inTopRight || inBottomLeft;
};

/**
 * Renders a QR-shaped placeholder as an inline SVG data URI: correct finder squares, pseudo-random
 * body. It is decorative only — no payload is actually encoded.
 */
export const buildPlaceholderQrDataUri = (seed: string): string => {
  const seedHash = hashString(seed);
  const modules: string[] = [];

  const finderOrigins: Array<[number, number]> = [
    [0, 0],
    [0, MODULE_COUNT - FINDER_SIZE],
    [MODULE_COUNT - FINDER_SIZE, 0],
  ];

  for (const [originRow, originCol] of finderOrigins) {
    for (let r = 0; r < FINDER_SIZE; r++) {
      for (let c = 0; c < FINDER_SIZE; c++) {
        const onOuterRing = r === 0 || r === FINDER_SIZE - 1 || c === 0 || c === FINDER_SIZE - 1;
        const inInnerBlock = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (onOuterRing || inInnerBlock) {
          modules.push(`<rect x="${originCol + c}" y="${originRow + r}" width="1" height="1"/>`);
        }
      }
    }
  }

  for (let row = 0; row < MODULE_COUNT; row++) {
    for (let col = 0; col < MODULE_COUNT; col++) {
      if (isFinderArea(row, col)) continue;
      const cellHash = hashString(`${seedHash}:${row}:${col}`);
      if (cellHash % 100 < 46) {
        modules.push(`<rect x="${col}" y="${row}" width="1" height="1"/>`);
      }
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${MODULE_COUNT + 4} ${MODULE_COUNT + 4}" shape-rendering="crispEdges">` +
    `<rect x="-2" y="-2" width="${MODULE_COUNT + 4}" height="${MODULE_COUNT + 4}" fill="#ffffff"/>` +
    `<g fill="#0A0A0A">${modules.join('')}</g>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
