

import { Paciente } from './paciente.schema';
import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import { PacienteTx } from './pacienteTx';
import { log } from '@andes/log';
import { logKeys } from '../../../config';
import { EventCoreV2 } from '@andes/event-bus';
import { IPaciente, IPacienteDoc } from './paciente.interface';
import { Matching } from '@andes/match';
import * as config from '../../../config';
import { MongoQuery, isSelected } from '@andes/query-builder';
import { getObraSocial } from '../../../modules/obraSocial/controller/obraSocial';

/**
 * Crea un objeto paciente
 */

export function make(body: IPaciente) {
    const paciente = new Paciente();
    paciente.set(body);
    return paciente;
}


/**
 * Guarda un objecto paciente en mongo y elastic.
 * Sincroniza con ElasticSearch si es necesario.
 *
 * @param {IPacienteDoc} body Datos del paciente
 * @param {express.Request} req Request de Express para obtener los datos del usuario
 */

export async function store(paciente: IPacienteDoc, req: express.Request, events = true) {
    const session = await Paciente.db.startSession();
    session.startTransaction();
    const isNew = paciente.isNew;
    try {
        const pacienteOriginal = paciente.original();
        const pacienteFields = paciente.modifiedPaths();

        Auth.audit(paciente, req);
        await paciente.save({ session });
        if (isNew || paciente.sincroniza()) {
            await PacienteTx.sync(paciente);
        }
        if (isNew) {
            log(req, logKeys.mpiInsert.key, paciente._id, logKeys.mpiInsert.operacion, paciente, null);
            await session.commitTransaction();
            if (events) {
                EventCoreV2.emitAsync('mpi:patient:create', paciente);
            }
        } else {
            log(req, logKeys.mpiUpdate.key, paciente._id, logKeys.mpiUpdate.operacion, paciente, pacienteOriginal);
            await session.commitTransaction();
            if (events) {
                EventCoreV2.emitAsync('mpi:patient:update', paciente, pacienteFields);
            }
        }
        return paciente;
    } catch (error) {
        if (isNew) {
            log(req, logKeys.mpiInsert.key, null, logKeys.mpiInsert.operacion, paciente, 'Error insertando paciente');
        } else {
            log(req, logKeys.mpiUpdate.key, paciente._id, logKeys.mpiUpdate.operacion, null, 'Error actualizando paciente');
        }
        await session.abortTransaction();
        if (error.name === 'ValidationError') {
            error.status = 400;
        }
        throw error;
    }
}

/**
 * Modifica los campos de un paciente.
 * @param {IPacienteDoc} paciente paciente a modifciar
 * @param {object} body Datos a modificar del paciente
 */

export function set(paciente: IPacienteDoc, body: any) {
    if (paciente.estado === 'validado') {
        delete body['documento'];
        delete body['apellido'];
        delete body['nombre'];
        delete body['sexo'];
        delete body['fechaNacimiento'];
        delete body['estado'];
    }
    paciente.set(body);
    return paciente;
}

/**
 * Busca un paciente por ID. Tanto en ANDES y MPI.
 * @param {string} id ID del paciente a buscar.
 * @param {object} options
 * @param {string} options.fields Listado de campos para projectar
 * @returns {IPacienteDoc}
 */

export async function findById(id: string | String | mongoose.Types.ObjectId, options = null): Promise<IPacienteDoc> {
    options = options || {};
    const { fields } = options;

    const queryFind = Paciente.findById(id);
    if (fields) {
        queryFind.select(fields);
    }
    const paciente = await queryFind;
    if (paciente) {
        if (isSelected(fields, 'financiador')) {
            paciente.financiador = await getObraSocial(paciente);
        }
        return paciente;
    }
    return null;
}

/**
 *
 */
export async function remove(paciente: IPacienteDoc, req: express.Request) {
    const session = await Paciente.db.startSession();
    session.startTransaction();
    try {
        paciente.$session(session);
        await paciente.remove();
        await PacienteTx.delete(paciente);
        await session.commitTransaction();
        log(req, logKeys.mpiDelete.key, paciente._id, logKeys.mpiDelete.operacion, paciente, null);
        EventCoreV2.emitAsync('mpi:patient:delete', paciente);
        return;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    }
}

/**
 * Busca pacientes dada de una cadena de texto por documento, apellido o nombre
 *
 * @param {string} query Condiciones a buscar
 */
export async function search(searchText: string) {
    let body = {
        bool: {
            must: {
                multi_match: {
                    query: searchText,
                    type: 'cross_fields',
                    fields: [
                        'apellido^5',
                        'nombre^5',
                        'alias^5',
                        'documento^5',
                        'apellido.ngram',
                        'nombre.ngram',
                        'documento.ngram',
                        'alias.ngram'],
                    operator: 'and'
                }
            },
            filter: {
                term: { activo: 'true' }
            }
        }
    };
    const pacientes = await PacienteTx.search({ query: body });
    return pacientes;
}

/**
 * Busca paciente similares a partir de su documento
 * Devuelve una lista de pacientes ordenada por score de forma descendente
 *
 * @param {object} query Condiciones a buscar
 *
 * [TODO] Definir el tipado de esta funcion
 */

export async function suggest(query: any) {
    if (query && query.documento) {
        const body = {
            bool: {
                must: {
                    match: {
                        documento: {
                            query: query.documento,
                            minimum_should_match: 3,
                            fuzziness: 2
                        }
                    }
                },
                filter: {
                    term: { activo: 'true' }
                }
            }
        };
        const sortScore = (a, b) => {
            return b._score - a._score;
        };
        let pacientes = await PacienteTx.search({ query: body });
        if (query.id) {
            pacientes = pacientes.filter(p => (p.id !== query.id));
        }
        pacientes.forEach((paciente) => {
            const value = matching(paciente, query);
            paciente._score = value;
        });

        return pacientes.sort(sortScore);
    } else {
        return [];
    }
}

/**
 * Realiza un matching entre dos pacientes.
 * Devuelve un valor con el porcentaje de matcheo entre 0 y 1
 *
 * @param {IPaciente} pacienteA Datos del paciente
 * @param {IPaciente} pacienteB Datos del paciente
 * @returns Devuelve un número que indica el porcentaje de matcheo entre los dos pacientes
 *
 */

export function matching(pacienteA: IPaciente | IPacienteDoc, pacienteB: IPaciente, weightsDefault?: any) {
    const personaA = {
        documento: pacienteA.documento ? pacienteA.documento.toString() : '',
        nombre: pacienteA.nombre ? pacienteA.nombre : '',
        apellido: pacienteA.apellido ? pacienteA.apellido : '',
        fechaNacimiento: pacienteA.fechaNacimiento ? moment(pacienteA.fechaNacimiento).format('YYYY-MM-DD') : '',
        sexo: pacienteA.sexo ? pacienteA.sexo : ''
    };

    const personaB = {
        documento: pacienteB.documento ? pacienteB.documento.toString() : '',
        nombre: pacienteB.nombre ? pacienteB.nombre : '',
        apellido: pacienteB.apellido ? pacienteB.apellido : '',
        fechaNacimiento: pacienteB.fechaNacimiento ? moment(pacienteB.fechaNacimiento).format('YYYY-MM-DD') : '',
        sexo: pacienteB.sexo ? pacienteB.sexo : ''
    };

    const match = new Matching();

    const valorMatching = match.matchPersonas(personaA, personaB, weightsDefault ? weightsDefault : config.mpi.weightsDefault, config.algoritmo);
    return valorMatching;

}


const searchSpecification = {
    identificadores: (value, query) => {
        return MongoQuery.queryArray('identificadores', value, 'entidad', 'valor');
    },
    relaciones: (value, query) => {
        return MongoQuery.queryArray('relaciones', value, 'relacion.nombre', 'referencia');
    },
    documento: MongoQuery.partialString,
    nombre: MongoQuery.partialString,
    apellido: MongoQuery.partialString,
    fechaNacimiento: MongoQuery.matchDate,
    sexo: MongoQuery.matchString,
    estado: MongoQuery.matchString,
    activo: MongoQuery.matchString,
    barrio: {
        filed: 'direccion.ubicacion.barrio.nombre',
        fn: MongoQuery.partialString
    },
    localidad: {
        filed: 'direccion.ubicacion.localidad.nombre',
        fn: MongoQuery.partialString
    },
    provincia: {
        filed: 'direccion.ubicacion.provincia.nombre',
        fn: MongoQuery.partialString
    },
    pais: {
        filed: 'direccion.ubicacion.pais.nombre',
        fn: MongoQuery.partialString
    },
    nacionalidad: MongoQuery.partialString,
    email: (value) => {
        return MongoQuery.queryArray('contacto', [`email|${value}`], 'tipo', 'valor');
    },
    celular: (value) => {
        return MongoQuery.queryArray('contacto', [`celular|${value}`], 'tipo', 'valor');
    },
    fijo: (value) => {
        return MongoQuery.queryArray('contacto', [`fijo|${value}`], 'tipo', 'valor');
    }
};

/**
 * Realiza una búsqueda de pacientes dada una condición
 * @param condicion
 * @param fields Selecciona los campos de los documentos a devolver
 * @returns Devuelve listado de paciente encontrados
 */
export async function find(condicion, options?: any) {
    options = options || {};
    const { fields, skip, limit } = options;

    const opciones = MongoQuery.buildQuery(condicion, searchSpecification);

    let pacientesQuery = Paciente.find(opciones);

    if (fields) {
        pacientesQuery.select(fields);
    }
    if (limit) {
        pacientesQuery.limit(limit);
    }
    if (skip) {
        pacientesQuery.skip(skip);
    }

    return await pacientesQuery;

}

export const PacienteCtr = {
    make,
    store,
    set,
    remove,
    search,
    matching,
    suggest,
    find,
    findById
};
