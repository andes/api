

import { Paciente } from './paciente.schema';
import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import { PacienteTx } from './pacienteTx';
import { log } from '@andes/log';
import { logKeys } from '../../../config';
import { EventCore } from '@andes/event-bus';
import { IPaciente, IPacienteDoc } from './paciente.interface';
import { Matching } from '@andes/match';
import * as config from '../../../config';
import {parseStr, rangoFechas, queryArray, queryMatch} from './../../../shared/queryBuilder';

/**
 * Crea un objeto paciente
 */

export function newPaciente(body: IPaciente) {
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

export async function storePaciente(paciente: IPacienteDoc, req: express.Request) {
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
            EventCore.emitAsync('mpi:patient:create', paciente);
        } else {
            log(req, logKeys.mpiUpdate.key, paciente._id, logKeys.mpiUpdate.operacion, paciente, pacienteOriginal);
            await session.commitTransaction();
            EventCore.emitAsync('mpi:patient:update', paciente, pacienteFields);
        }
        return paciente;
    } catch (error) {
        if (isNew) {
            log(req, logKeys.mpiInsert.key, null, logKeys.mpiInsert.operacion, paciente, 'Error insertando paciente');
        } else {
            log(req, logKeys.mpiUpdate.key, paciente._id, logKeys.mpiUpdate.operacion, null, 'Error actualizando paciente');
        }
        await session.abortTransaction();
        throw error;
    }
}

/**
 * Modifica los campos de un paciente.
 * @param {IPacienteDoc} paciente paciente a modifciar
 * @param {object} body Datos a modificar del paciente
 */

export function updatePaciente(paciente: IPacienteDoc, body: any) {
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
    return await queryFind;
}

/**
 *
 */
export async function deletePaciente(paciente: IPacienteDoc, req: express.Request) {
    const session = await Paciente.db.startSession();
    session.startTransaction();
    try {
        paciente.$session(session);
        await paciente.remove();
        await PacienteTx.delete(paciente);
        await session.commitTransaction();
        log(req, logKeys.mpiDelete.key, paciente._id, logKeys.mpiDelete.operacion, paciente, null);
        EventCore.emitAsync('mpi:patient:create', paciente);
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
                    fields: ['documento', 'apellido^5', 'nombre^4'],
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
            pacientes.filter(p => (p.id !== query.id));
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

    const valorMatching = match.matchPersonas(personaA, personaB, weightsDefault ? weightsDefault : config.mpi.weightsDefault , config.algoritmo);
    return valorMatching;

}

/**
 * Realiza una búsqueda de pacientes dada una condición
 * @param condicion
 * @param fields Selecciona los campos de los documentos a devolver
 * @returns Devuelve listado de paciente encontrados
 */
export async function findPaciente(condicion, options?: any) {
    options = options || {};
    const { fields, skip, limit } = options;

    const opciones = {};
    const filtros = [];
    let identificadores = [];
    // identificadores ['Entidad1 | valor'... 'EntidadN | valorN'} ]
    if (condicion.identificadores) {
        if (Array.isArray(condicion.identificadores)) {
            identificadores = condicion.identificadores;
        } else {
            identificadores = [condicion.identificadores];
        }
        filtros.push(queryArray('identificadores', identificadores, 'entidad', 'valor', '$and'));
    }
    if (condicion.documento) {
        opciones['documento'] =  parseStr(condicion.documento);
    }
    if (condicion.nombre) {
        opciones['nombre'] =  parseStr(condicion.nombre);
    }
    if (condicion.apellido) {
        opciones['apellido'] = parseStr(condicion.apellido);
    }
    if (condicion.fechaNacimiento) {
        opciones['fechaNacimiento'] = rangoFechas(condicion.fechaNacimiento);
    }
    if (condicion.estado) {
        opciones['estado'] = condicion.estado;
    }
    if (condicion.activo) {
        opciones['activo'] = condicion.activo;
    }
    if (condicion.barrio) {
        opciones['direccion.ubicacion.barrio.nombre'] =  parseStr(condicion.barrio);
    }
    if (condicion.localidad) {
        opciones['direccion.ubicacion.localidad.nombre'] = parseStr(condicion.localidad);
    }
    if (condicion.provincia) {
        opciones['direccion.ubicacion.provincia.nombre'] = parseStr(condicion.provincia);
    }
    if (condicion.pais) {
        opciones['direccion.ubicacion.pais.nombre'] = parseStr(condicion.pais);
    }
    if (condicion.nacionalidad) {
        opciones['nacionalidad'] = parseStr(condicion.nacionalidad);
    }

    let contactos = [];
    if (condicion.email) {
        contactos.push('email |' + condicion.email);
    }
    if (condicion.celular) {
        contactos.push('celular |' + condicion.celular);
    }
    if (condicion.fijo) {
        contactos.push('fijo |' + condicion.fijo);
    }
    if (contactos.length > 0) {
        filtros.push( queryArray('contactos', contactos, 'tipo', 'valor'));
    }
    if (condicion.relaciones) {
        let relaciones = [];
        if (Array.isArray(condicion.relaciones)) {
            relaciones = condicion.relaciones;
        } else {
            relaciones = [condicion.relaciones];
        }
        filtros.push(queryArray('relaciones', relaciones, 'relacion.nombre', 'referencia', '$and'));
    }

    if (filtros.length > 0) {
        opciones['$and'] = filtros;
    }

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
