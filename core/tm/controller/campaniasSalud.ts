import * as campania from '../../tm/schemas/campaniasSalud';

export async function campaniasVigentes(today) {
    return new Promise((resolve, reject) => {
        const query = { $and: [{ 'vigencia.desde': { $gte: today } }, { 'vigencia.hasta': { $lte: today } }] };
        campania.find(query, (err, docs) => {
            if (err) {
                return reject(null);
            }
            resolve(docs);
        }).sort({ 'vigencia.desde': -1 });
    });
}

export async function campanias(fechaDesde, fechaHasta) {
    const query = {
        $nor: [{ 'vigencia.desde': { $gt: fechaHasta } },
        { 'vigencia.hasta': { $lt: fechaDesde } }
        ]
    };
    let res;
    try {
        res = await campania.find(query).sort({ 'vigencia.desde': -1 });
    }
    catch (e) {
        return e;
    }
    return res;
}
