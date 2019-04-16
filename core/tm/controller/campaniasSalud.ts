import * as campania from '../../tm/schemas/campaniasSalud';

export async function campaniasVigentes(today: Date) {
    this.campanias(today, today);
}

/**
 * Devuelve las campañas de salud activas en el período entre fechaDesde y fechaHasta.
 * Si se necesita las campañas vigentes en el día de la fecha, utilizar campaniasVigentes(today: Date)
 * Si fechaDesde = 18/10/2018 y fechaHasta = 26/10/2018
 * Entonces trae las campañas con vigencia:
 * fechaDesde = 18/10/2018 y fechaHasta = 26/10/2018
 * fechaDesde = 20/10/2018 y fechaHasta = 22/10/2018
 *
 * Y no trae las campañas con vigencia:
 * fechaDesde = 10/09/2018 y fechaHasta = 29/12/2020
 * fechaDesde = 17/10/2018 y fechaHasta = 25/10/2018
 * fechaDesde = 25/10/2018 y fechaHasta = 30/10/2018
 * @export
 * @param {Date} fechaDesde
 * @param {Date} fechaHasta
 * @returns
 */
export async function campanias(fechaDesde: Date, fechaHasta: Date) {
    const query = { $and: [{ 'vigencia.desde': { $lte: fechaDesde } }, { 'vigencia.hasta': { $gte: fechaHasta } }] };
    let res;
    try {
        res = await campania.find(query).sort({ 'vigencia.desde': -1 });
    } catch (e) {
        return e;
    }
    return res;
}
