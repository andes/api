import * as mongoose from 'mongoose';

/**
 * Función recursiva que permite recorrer un objeto y todas sus propiedades
 * y al llegar a un nodo hoja ejecutar una funcion
 * @param {any} obj Objeto a recorrer
 * @param {any} func Nombre de la función callback a ejecutar cuando llega a un nodo hoja
 */
export function iterate(obj, func) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (Array.isArray(obj[property])) {
                iterate(obj[property], func);
            } else if (typeof obj[property] === 'object') {
                iterate(obj[property], func);
            } else {
                func(obj, property);
            }
        }
    }
}


/**
 * Convierte las propiedades '_id' y 'id' de un objeto al tipo ObjectId
 *
 * @param {any} obj Objeto
 * @param {string} property Propiedad
 */
export function convertToObjectId(obj, property: string) {
    if (property === 'id' || property === '_id') {
        // verificamos si es un ObjectId valido y, ademas,
        // si al castear a ObjectId los strings son iguales
        // StackOverflow: https://stackoverflow.com/a/29231016
        if (mongoose.Types.ObjectId.isValid(obj[property]) && new mongoose.Types.ObjectId(obj[property]) === obj[property]) {
            obj[property] = mongoose.Types.ObjectId(obj[property]);
        }
    }
}
