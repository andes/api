import { tipoPrestacion } from './../../../core/tm/schemas/tipoPrestacion';
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

/**
 * Devuelve prestaciones en las que contengan alguno de los conceptos
 * enviados por parametro dentro de su array de registros
 *
 * @param {any} prestaciones Array de prestaciones a recorrer y buscar
 * @param {any} conceptos Array con conceptId de SNOMED a buscar dentro de los registros de prestaciones
 * @returns {any[]} Prestaciones que matcheen con 'conceptos'
 */
export function buscarEnHuds(prestaciones, conceptos) {
    let data = [];
    // recorremos prestaciones
    prestaciones.forEach((prestacion: any) => {
        // recorremos los registros de cada prestacion
        prestacion.ejecucion.registros.forEach(registro => {

            // verificamos si el registro de la prestacion tiene alguno de
            // los conceptos en su array de registros
            let resultado = matchConcepts(registro, conceptos);

            if (resultado) {
                // agregamos el resultado a a devolver
                data.push({
                    tipoPrestacion: prestacion.solicitud.tipoPrestacion,
                    fecha: registro.createdAt,
                    profesional: registro.createdBy,
                    registro: resultado
                });
            }

        });
    });

    return data;
}

/**
 * Método recursivo que busca los conceptos enviados por parametro
 * dentro del array de registros de una prestación
 *
 * @param {any} registro Registro actual a consultar por conceptId o ver si tiene un subarray de registros para seguir loopeando
 * @param {any} conceptos Array con conceptId de SNOMED a buscar dentro de la variable registro
 * @returns {any} Si existe el concepto en el array de registros devuelve el registro, si no FALSE.
 */
export function matchConcepts(registro, conceptos) {
    // almacenamos la variable de matcheo para devolver el resultado
    let match = false;

    if (Array.isArray(registro['registros']) && registro['registros'].length > 0) {
        registro['registros'].forEach((reg: any) => {

            if (matchConcepts(reg, conceptos)) {
                match = reg;
            }
        });
    } else {
        // verificamos que el concepto coincida con alguno de los elementos enviados en los conceptos
        if (registro.concepto && registro.concepto.conceptId && conceptos.indexOf(registro.concepto.conceptId) !== -1) {
            match = registro;
        }
    }

    return match;
}
