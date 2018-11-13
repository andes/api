import * as campania from '../../tm/schemas/campaniasSalud';

/**
 * Devuelve las campañas de salud activas en el período entre fechaDesde y fechaHasta.
 * Si se necesita las campañas vigentes en el día de la fecha, pasar dos veces la fecha del día
 * Si fechaDesde = 18/10/2018 y fechaHasta = 26/10/2018
 * Entonces trae las campañas con vigencia:
 * fechaDesde = 15/10/2018 y fechaHasta = 23/10/2018
 * fechaDesde = 23/10/2018 y fechaHasta = 30/10/2018
 * fechaDesde = 20/10/2018 y fechaHasta = 22/10/2018
 *
 * Y no trae las campañas con vigencia:
 * fechaDesde = 18/09/2018 y fechaHasta = 26/09/2018
 * fechaDesde = 18/11/2018 y fechaHasta = 26/11/2018
 * @export
 * @param {*} fechaDesde
 * @param {*} fechaHasta
 * @returns
 */
export async function campanias(fechaDesde, fechaHasta) {
    const query = {
        $nor: [{ 'vigencia.desde': { $gt: fechaHasta } },
        { 'vigencia.hasta': { $lt: fechaDesde } }
        ]
    };
    let res;
    try {
        res = await campania.find(query).sort({ 'vigencia.desde': -1 });
    } catch (e) {
        return e;
    }
    return res;
}
