import * as campania from '../../tm/schemas/campaniasSalud';

export async function campaniasVigentes(today) {
    return new Promise((resolve, reject) => {
        const query = { $and: [{ 'vigencia.desde': { $lte: today } }, { 'vigencia.hasta': { $gte: today } }] };
        campania.find(query, (err, docs) => {
            if (err) {
                return reject(null);
            }
            resolve(docs);
        }).sort({ 'vigencia.desde': -1 });
    });
}
