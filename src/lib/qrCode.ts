import qrcode from 'qrcode-generator';

/**
 * QR code generation for the admin's shareable link.
 *
 * These are **static** QR codes: the destination URL is encoded directly into the pattern, so the
 * printed/shared code keeps working forever with no redirect service, no account and no expiry
 * behind it. (The "free QR generators" that expire are dynamic ones — they encode a short link
 * owned by the generator, which stops resolving when the trial ends.) The trade-off is that the
 * URL can never be repointed after printing, which is the right call here: the site's address is
 * the one thing that should not change.
 *
 * Encoding runs entirely in the browser, so the shop's link is never sent to a third-party
 * service and the panel keeps working offline as an installed PWA.
 */

/**
 * ~15% of the code can be damaged and still scan. Enough tolerance for a scuffed print or a
 * phone camera at an angle, without inflating the module count the way 'Q'/'H' would.
 */
const ERROR_CORRECTION_LEVEL = 'M';

/** The quiet zone the spec requires around the pattern; scanners rely on it to find the code. */
export const QR_QUIET_ZONE_MODULES = 4;

/**
 * Encodes `text` and returns the finished matrix as `modules[row][col]`, `true` meaning a dark
 * square. Type number 0 lets the encoder pick the smallest version the payload fits in.
 */
export const buildQrModules = (text: string): boolean[][] => {
  const qr = qrcode(0, ERROR_CORRECTION_LEVEL);
  qr.addData(text);
  qr.make();

  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => qr.isDark(row, col))
  );
};

/**
 * SVG path data for every dark module, in module units — so the consumer sets the scale via the
 * viewBox instead of baking pixel sizes in. One `<path>` beats ~400 `<rect>`s for a typical URL.
 */
export const qrModulesToPathData = (modules: boolean[][]): string => {
  const commands: string[] = [];

  modules.forEach((row, rowIndex) => {
    row.forEach((isDark, colIndex) => {
      if (isDark) commands.push(`M${colIndex} ${rowIndex}h1v1h-1z`);
    });
  });

  return commands.join('');
};

interface PngOptions {
  /** Target width/height in pixels. The real output is rounded down so modules land on whole
   *  pixels — a fractional module size is what makes a downloaded QR look fuzzy. */
  targetSizePx?: number;
}

/**
 * Renders the matrix to a PNG blob for download/sharing.
 *
 * Always black on opaque white, never themed: a scanner needs the dark/light contrast, and a
 * transparent background would render as black-on-black wherever the image is pasted.
 */
export const qrModulesToPngBlob = (
  modules: boolean[][],
  { targetSizePx = 1024 }: PngOptions = {}
): Promise<Blob> => {
  const sizeInModules = modules.length + QR_QUIET_ZONE_MODULES * 2;
  // Whole pixels per module, and at least 1 so a huge payload still renders something scannable.
  const modulePx = Math.max(1, Math.floor(targetSizePx / sizeInModules));
  const canvasPx = modulePx * sizeInModules;

  const canvas = document.createElement('canvas');
  canvas.width = canvasPx;
  canvas.height = canvasPx;

  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Canvas 2D não disponível neste navegador.'));

  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvasPx, canvasPx);

  context.fillStyle = '#000000';
  modules.forEach((row, rowIndex) => {
    row.forEach((isDark, colIndex) => {
      if (!isDark) return;
      context.fillRect(
        (colIndex + QR_QUIET_ZONE_MODULES) * modulePx,
        (rowIndex + QR_QUIET_ZONE_MODULES) * modulePx,
        modulePx,
        modulePx
      );
    });
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Não foi possível gerar a imagem do QR Code.'));
    }, 'image/png');
  });
};
