import * as formularioTerapeutico from '../schemas/formularioTerapeutico';
import * as mongoose from 'mongoose';
let arr = [];

export function getPadre(hijo) {
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

export async function getPadres(hijo) {
    if (hijo !== null) {
        return getPadre(hijo).then((padre) => {
            arr.unshift(padre);
            getPadres(padre['idpadre']);
        });
    } else {
        console.log('arr ', arr);
        return (arr);
    }
}

