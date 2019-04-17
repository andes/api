import * as campania from '../../tm/schemas/campaniasSalud';
import moment = require('moment');

/**
 * Devuelve las campañas de salud activas en el período entre fechaDesde y fechaHasta.
 * Si se necesita las campañas vigentes en el día de la fecha, mandar una sola fecha
 *
 * Si se pasan dos fechas, trae las campañas que su periodo de vigencia cae estrictamente dentro del periodo
 * de las fechas pasadas por parámetro
 * Si se pasa una sola fecha, trae las campañas que incluyen esa fecha dentro de su periodo de vigencia
 * @export
 * @param {Date} fechaDesde
 * @param {Date} fechaHasta
 * @returns
 */
export async function campaniasVigentes(fechaDesde: Date, fechaHasta?: Date) {
    let query;
    if (fechaHasta) { // trae las campañas vigentes dentro del periodo
        query = { 'vigencia.desde': { $gte: fechaDesde }, 'vigencia.hasta': { $lte: moment(fechaHasta).add(1, 'days') } };
    } else { // trae las campañas vigentes en una fecha especifica (hoy)
        query = { 'vigencia.desde': { $lte: fechaDesde }, 'vigencia.hasta': { $gte: fechaDesde } };
    }
    let res;
    try {
        res = await campania.find(query).sort({ 'vigencia.desde': -1 });
    } catch (e) {
        return e;
    }
    return res;
}
