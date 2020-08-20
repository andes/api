import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { model as Prestacion } from '../schemas/prestacion';

/**
 * Función recursiva que permite recorrer un objeto y todas sus propiedades
 * y al llegar a un nodo hoja ejecutar una funcion
 * @param {any} obj Objeto a recorrer
 * @param {any} func Nombre de la función callback a ejecutar cuando llega a un nodo hoja
 */
export function iterate(obj, func) {
    for (const property in obj) {
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
 * Dado un conjunto de prestaciones, devuelve un array con aquellas que contengan, en su arreglo de registros,
 *  alguno de los conceptos enviados por parametro
 *
 * @param {any} prestaciones Array de prestaciones a recorrer y buscar
 * @param {any[]} conceptos Array con conceptos mas específicos a filtrar dentro de los registros
 * @returns {any[]} Prestaciones que matcheen con los conceptos ingresados por parametro
 */
export function buscarRegistros(prestaciones, filtroPrestaciones, conceptos) {
    let data = [];

    // recorremos prestaciones
    prestaciones.forEach((prestacion: any) => {
        let registros = [];
        let registrosAux = [];
        let motivoConsulta;
        // recorremos los registros de cada prestacion del paciente.
        prestacion.ejecucion.registros.forEach(reg => {
            // Si alguna prestación matchea con una de las anteriormente filtradas..
            if (filtroPrestaciones.find(fp => fp.conceptId === reg.concepto.conceptId)) {
                motivoConsulta = { term: reg.concepto.term, conceptId: reg.concepto.conceptId };
                // Se recorre la prestacion recursivamente buscando los conceptos de interés
                registrosAux = registrosProfundidad(reg, conceptos);
                registrosAux.forEach(elto => {
                    registros.push(elto);
                });
            }
        });
        if (registros.length) {
            // se agrega la prestacion y los conceptos matcheados al arreglo a retornar
            data.push({
                motivo: motivoConsulta,
                fecha: prestacion.createdAt,
                profesional: prestacion.createdBy,
                conceptos: registros
            });
        }
    });

    return data;
}

export async function getPrestaciones(paciente, { estado = 'validada', desde = null, hasta = null }) {
    const query = {
        'paciente.id': paciente._id,
        $where: `this.ultimoEstado.tipo ==  "${estado}"`
    };
    if (desde || hasta) {
        query['ejecucion.fecha'] = {};
        if (desde) {
            query['ejecucion.fecha']['$gte'] = moment(desde).startOf('day').toDate();
        }
        if (hasta) {
            query['ejecucion.fecha']['$lte'] = moment(hasta).endOf('day').toDate();
        }
    }

    return await Prestacion.find(query);
}

export function filtrarRegistros(prestaciones: any[], { semanticTags }) {
    let registros = [];
    prestaciones.forEach(prestacion => {
        const regis = prestacion.ejecucion.registros.filter(registro => {
            const semTag = registro.concepto.semanticTag;
            return semanticTags.find(el => el === semTag);
        });
        registros = [...registros, ...regis];
    });
    return registros;
}

/**
 * Método recursivo que busca los conceptos enviados por parametro
 * dentro del array de registros de una prestación
 *
 * @param {any} registro Registro actual a consultar por conceptId o ver si tiene un subarray de registros para seguir loopeando
 * @param {any} conceptos Array con conceptId de SNOMED a buscar dentro de la variable registro
 * @returns {any} Array con todos los conceptos que matchearon
 */
export function registrosProfundidad(registro, conceptos) {
    let data = [];

    if (registro.registros && registro.registros.length) {
        registro.registros.forEach((reg: any) => {
            let dataAux = registrosProfundidad(reg, conceptos);
            dataAux.forEach(elto => {
                data.push(elto);
            });
        });
    }
    // En caso de que 'conceptos' sea un array de conceptos snomed
    if (registro.concepto && registro.concepto.conceptId && conceptos.find(c => c.conceptId === registro.concepto.conceptId)) {
        data.push({
            nombre: registro.nombre,
            concepto: registro.concepto,
            valor: registro.valor,
            id: registro.id
        });
    }
    return data;
}


export function buscarEnHuds(prestaciones, conceptos) {
    let data = [];

    // recorremos prestaciones
    prestaciones.forEach((prestacion: any) => {
        // recorremos los registros de cada prestacion
        prestacion.ejecucion.registros.forEach(unRegistro => {
            // verificamos que el concepto coincida con alguno de los elementos enviados en los conceptos
            if (unRegistro.concepto && unRegistro.concepto.conceptId && conceptos.find(c => c.conceptId === unRegistro.concepto.conceptId)) {
                data.push({
                    tipoPrestacion: prestacion.solicitud.tipoPrestacion,
                    fecha: prestacion.ejecucion.fecha,
                    profesional: unRegistro.createdBy,
                    registro: unRegistro
                });
            }
            // verificamos si el registro de la prestacion tiene alguno de los conceptos en su array de registros
            let resultado: any = matchConcepts(unRegistro, conceptos);

            if (resultado && resultado.id !== unRegistro.id) {
                // agregamos el resultado a a devolver
                data.push({
                    tipoPrestacion: prestacion.solicitud.tipoPrestacion,
                    fecha: prestacion.ejecucion.fecha,
                    profesional: unRegistro.createdBy,
                    registro: resultado
                });
            }
        });
    });

    return data;
}


export function matchConcepts(registro, conceptos) {
    // almacenamos la variable de matcheo para devolver el resultado
    let match = false;

    if (!Array.isArray(registro['registros']) || registro['registros'].length <= 0) {
        // verificamos que el concepto coincida con alguno de los elementos enviados en los conceptos
        if (registro.concepto && registro.concepto.conceptId && conceptos.find(c => c.conceptId === registro.concepto.conceptId)) {
            match = registro;
        }
    } else {
        registro['registros'].forEach((reg: any) => {
            let encontrado = null;
            if (encontrado = matchConcepts(reg, conceptos)) {
                match = encontrado;
            }
        });
    }
    return match;
}
