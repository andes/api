

import { Paciente, PacienteMpi } from './paciente.schema';
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
import {parseStr, rangoFechas} from './../../../shared/queryBuilder';


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

export async function savePaciente(paciente: IPacienteDoc, req: express.Request) {
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
    let personaA = {
        documento: pacienteA.documento ? pacienteA.documento.toString() : '',
        nombre: pacienteA.nombre ? pacienteA.nombre : '',
        apellido: pacienteA.apellido ? pacienteA.apellido : '',
        fechaNacimiento: pacienteA.fechaNacimiento ? moment(pacienteA.fechaNacimiento).format('YYYY-MM-DD') : '',
        sexo: pacienteA.sexo ? pacienteA.sexo : ''
    };

    let personaB = {
        documento: pacienteB.documento ? pacienteB.documento.toString() : '',
        nombre: pacienteB.nombre ? pacienteB.nombre : '',
        apellido: pacienteB.apellido ? pacienteB.apellido : '',
        fechaNacimiento: pacienteB.fechaNacimiento ? moment(pacienteB.fechaNacimiento).format('YYYY-MM-DD') : '',
        sexo: pacienteB.sexo ? pacienteB.sexo : ''
    };

    let match = new Matching();

    let valorMatching = match.matchPersonas(personaA, personaB, weightsDefault ? weightsDefault : config.mpi.weightsDefault , config.algoritmo);
    return valorMatching;

}

/**
 * Realiza una búsqueda de pacientes dada una condición
 *@param condicion
 *@param fields Setea los campos de los documentos a devolver
 *@returns
 */
export async function findPaciente(condicion, fields?: string) {

    try {

        const opciones = {};
        // identificadores [{'Entidad1'| valor}... {'EntidadN'| valorN} ]
        if (condicion.indentificadores) {
            let conds = [];
           // verifica los identificadores
            condicion.indentificadores.forEach(identificador => {
                let ids = identificador.split('|');
                let filtro;
                if (ids[0]) {
                    filtro['identificadores.entidad'] = ids[0];
                }
                if (ids[1]) {
                    filtro['identificadores.valor'] = ids[1];
                }
                conds.push(filtro);

            });
            opciones['identificadores'] = {$elemMatch: conds
            };
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
        if (condicion.localidad) {
            opciones['direccion.ubicacion.localidad.nombre'] = parseStr(condicion.localidad);
        }
        if (condicion.barrio) {
            opciones['direccion.ubicacion.barrio.nombre'] =  parseStr(condicion.barrio);
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
            contactos.push({tipo: 'email', valor: parseStr(condicion.email)});
        }
        if (condicion.celular) {
            contactos.push({tipo: 'celular', valor: parseStr(condicion.celular)});
        }
        if (condicion.fijo) {
            contactos.push({tipo: 'fijo', valor: parseStr(condicion.fijo)});
        }
        if (contactos.length) {
            opciones['contactos'] = {$elemMatch: contactos};
        }

        let pacientesAndes = await Paciente.find(opciones).select(fields);
        let pacientesMPI = await PacienteMpi.find(opciones).select(fields);
        let pacientes = [];
        pacientesAndes.forEach(p => {
            if ((pacientesMPI.findIndex(pMpi => pMpi.id === p.id)) === -1) {
                pacientes.push(p);
            }
        });
        pacientes.concat(pacientesMPI);

        return pacientes;
    } catch (error) {
        throw error;
    }

}
