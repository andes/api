import * as formularioTerapeutico from '../schemas/formularioTerapeutico';
import * as mongoose from 'mongoose';

export function getAncestro(hijo) {
    return new Promise((resolve, reject) => {
        let query = formularioTerapeutico.find({ _id: { '$eq': mongoose.Types.ObjectId(hijo) } });
        query.exec(function (err, data) {
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
                let padre = await getAncestro(hijo); // Find a mongo
                if (padre) {
                    arr.unshift(padre);
                    let result = await getPadres(padre['idpadre'], arr);
                    if (result) {
                        resolve(result);
                    } else {
                        resolve(arr);
                    }
                }
            } else {
                resolve(null);
            }
        } catch (e) {
            // console.log(e);
        }
    });
}
