const bwipjs = require('bwip-js');

/**
 * Genera un código de barras como SVG vectorial.
 * @param text Texto que será codificado
 * @param bcid Tipo de código de barras, por defecto 'code128'
 * @returns String SVG para insertar directamente en el HTML
 */
export function generateBarcodeSVG(text: string, bcid: string) {
    bcid = bcid ? bcid : 'code128';
    let svg = bwipjs.toSVG({
        bcid,
        text,
        scale: 4,
        height: 8,
        includetext: true,
        textxalign: 'center',
    });
    // Agregar dimensiones explícitas en mm para que PhantomJS renderice correctamente
    // viewBox: 0 0 448 123 → proporción ancho:alto = 3.64:1
    // height=8mm → width=29mm
    svg = svg.replace('<svg viewBox=', '<svg width="29mm" height="8mm" viewBox=');
    return svg;
}
