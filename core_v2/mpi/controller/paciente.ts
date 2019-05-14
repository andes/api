

import { Paciente, PacienteMpi } from '../schemas/paciente';
import * as mongoose from 'mongoose';
import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { PacienteTx } from './pacienteTx';
import { log } from '@andes/log';
import { logKeys } from '../../../config';
import { EventCore } from '@andes/event-bus';
import { IPaciente, IPacienteDoc } from '../interfaces/Paciente.interface';

/**
 * Persiste un nuevo paciente en la base de datos ANDES y los sincroniza con ElasticSearch.
 *
 * @param {IPaciente} body Datos del paciente
 * @param {express.Request} req Request de Express para obtener los datos del usuario
 */


export async function createPaciente(body: IPaciente, req) {
    const session = await Paciente.db.startSession();
    try {
        session.startTransaction();
        const paciente = new Paciente();
        paciente.set(body);
        Auth.audit(paciente, req);
        await paciente.save({ session});
        await PacienteTx.create(paciente);
        log(req, logKeys.mpiInsert.key, paciente._id, logKeys.mpiInsert.operacion, paciente, null);
        await session.commitTransaction();
        EventCore.emitAsync('mpi:patient:create', paciente);
        return paciente;
    } catch (error) {
        log(req, logKeys.mpiInsert.key, null, logKeys.mpiInsert.operacion, body, 'Error insertando paciente');
        session.abortTransaction();
        throw error;
    }
}

/**
 * Actualiza un paciente existente. Si esta en MPI, lo crea en ANDES. Sino lo actualiza.
 * Sincroniza con ElasticSearch si es necesario.
 *
 * @param {IPaciente} body Datos del paciente
 * @param {express.Request} req Request de Express para obtener los datos del usuario
 */

export async function updatePaciente(paciente: IPacienteDoc, req: express.Request) {
    const session = await Paciente.db.startSession();
    session.startTransaction();
    try {
        const pacienteOriginal = paciente.toObject();
        const pacienteFields = paciente.modifiedPaths();
        Auth.audit(paciente, req);
        await paciente.save({ session });
        if (paciente.sincroniza()) {
            await PacienteTx.sync(paciente);
        }
        EventCore.emitAsync('mpi:patient:update', paciente, pacienteFields);
        log(req, logKeys.mpiUpdate.key, paciente._id, logKeys.mpiUpdate.operacion, paciente, pacienteOriginal);
        await session.commitTransaction();
        return paciente;

    } catch (error) {
        log(req, logKeys.mpiUpdate.key, req.body._id, logKeys.mpiUpdate.operacion, null, 'Error actualizando paciente');
        session.abortTransaction();
        throw error;
    }
}

type DatabaseType = 'andes' | 'mpi';

/**
 * @typedef {Promise} IFindById
 * @prop {String} db - Base de datos donde pertenece el paciente
 * @prop {String} paciente - Objecto paciente
 */

type IFindById = Promise<{
    db: DatabaseType,
    paciente: IPacienteDoc
}>;

/**
 * Busca un paciente por ID. Tanto en ANDES y MPI.
 * @param {string} id ID del paciente a buscar.
 * @param {object} options
 * @param {string} options.fields Listado de campos para projectar
 * @returns {IFindById}
 */

export async function findById(id: string | String | mongoose.Types.ObjectId, options = null): IFindById {
    function makeFindById(Schema, select) {
        const queryFind = Schema.findById(id);
        if (select) {
            queryFind.select(select);
        }
        return queryFind;
    }
    options = options || {};
    const { fields } = options;
    let paciente = await makeFindById(Paciente, fields);
    if (paciente) {
        return {
            db: 'andes',
            paciente
        };
    } else {
        paciente = await makeFindById(PacienteMpi, fields);
        if (paciente) {
            return {
                db: 'mpi',
                paciente
            };
        }
    }
    return null;
}

/**
 * Search de paciente en ElasticSearch
 *
 * @param {String} type Tipo de busqueda. Enum: 'simplequery', 'multimatch', 'suggest'
 * @param {Object} query Condiciones a buscar
 */
export async function search(type: 'simplequery' | 'multimatch' | 'suggest', query: any) {
    let body;
    switch (type) {
        case 'simplequery':
            body = {
                simple_query_string: {
                    query: `"${query.documento}" +"${query.apellido}" +"${query.nombre}" +"${query.sexo}"`,
                    fields: ['documento', 'apellido', 'nombre', 'sexo'],
                    default_operator: 'and'
                }
            };

            break;
        case 'multimatch':
            body = {
                bool: {
                    must: {
                        multi_match: {
                            query: query.cadenaInput,
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

            break;
        case 'suggest':
            body = {
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
            break;
    }
    const pacientes = await PacienteTx.search({ query: body });
    return pacientes;

}

