import * as formularioTerapeutico from '../schemas/formularioTerapeutico';
import * as mongoose from 'mongoose';

export function getAncestro(hijo) {
    return new Promise((resolve, reject) => {
        const query = formularioTerapeutico.find({ _id: { $eq: mongoose.Types.ObjectId(hijo) } });
        query.exec((err, data) => {
            if (err) {
                reject('No se encontro el elemento en el Formulario Terapeutico');
            }
            if (data.length > 0) {
                resolve(data[0]);
            } else {
                resolve(null);
            }
        });
    });
}

export function getPadres(hijo, arr) {
    return new Promise(async (resolve, reject) => {
        try {
            if (hijo !== null) {
                const padre = await getAncestro(hijo); // Find a mongo
                if (padre) {
                    arr.unshift(padre);
                    const result = await getPadres(padre['idpadre'], arr);
                    if (result) {
                        resolve(result);
                    } else {
                        resolve(arr);
                    }
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        } catch (e) {
            reject(e);
        }
    });
}
