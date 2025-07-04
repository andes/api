const bwipjs = require('bwip-js');

/**
 * Genera un código de barras como imagen PNG en base64.
 * @param text Texto que será codificado
 * @param bcid Tipo de código de barras, por defecto 'code128'
 * @returns Cadena base64 para usar como <img src="data:image/png;base64,...">
 */
export async function generateBarcodeBase64(text: string, bcid: string) {
    bcid = bcid ? bcid : 'code128';
    const pngBuffer = await bwipjs.toBuffer({
        bcid,
        text,
        scale: 1,
        height: 8,
        includetext: true,
    });

    return pngBuffer.toString('base64');
}
