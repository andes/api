import * as reglas from '../schemas/reglas';

/**
 *
 *
 * @export
 * @param {*} listaReglas Array de reglas creadas/modificadas para un par (organizacion, prestacion) destino
 */
export function guardarReglas(listaReglas) {
    let listaSave = [];
    let resultados = [];
    listaReglas.forEach((regla) => {
        listaSave.push(saveUpdate(regla, resultados));
    });
    return ({
        lista: listaSave, resultados: resultados
    });
}

function saveUpdate(regla, resultados) {
    if (regla._id) { // Si ya existe la regla la modifica
        return new Promise((resolve, reject) => {
            reglas.findByIdAndUpdate(regla._id, regla, { upsert: true }, function (err, data) {
                if (err) {
                    reject(err);
                }
                resultados.push(data);
                resolve(data);
            });

        });
    } else { // Si no existe, crea una nueva
        let data = new reglas(regla);
        return new Promise((resolve, reject) => {
            data.save((err) => {
                if (err) {
                    reject(err);
                }
                resultados.push(data);
                resolve(data);
            });
        });
    }
}
