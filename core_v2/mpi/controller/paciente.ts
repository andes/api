

import {Paciente, PacienteMpi} from '../schemas/paciente';
import * as mongoose from 'mongoose';
import * as express from 'express';
import {Connections} from '../../../connections';
import { Auth } from '../../../auth/auth.class';
import { ElasticSync } from '../../../utils/elasticSync';
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


export async function createPaciente(body, req) {
    const session = await Paciente.db.startSession();
    try {
        session.startTransaction();
        const paciente = new Paciente();
        paciente.set(body);
        Auth.audit(paciente, req);
        await paciente.save({ session});
        const connElastic = new ElasticSync();
        await connElastic.create(String(paciente._id), (paciente as any).toElastic());
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

export async function updatePaciente(paciente, req: express.Request) {
    const session = await Paciente.db.startSession();
    session.startTransaction();
    try {

        const pacienteOriginal = paciente.toObject();
        const pacienteFields = paciente.modifiedPaths();
        Auth.audit(paciente, req);
        await paciente.save({ session});
        if (paciente.sincroniza()) {
            const connElastic = new ElasticSync();
            await connElastic._sync(paciente.id, paciente);
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
 * @returns {IFindById}
 */

export async function findById(id: string | String | mongoose.Types.ObjectId): IFindById {
    let base: DatabaseType = 'andes';
    let paciente = await Paciente.findById(id);
    if (!paciente) {
        base = 'mpi';
        paciente = await PacienteMpi.findById(id);
        if (!paciente) {
            base = '';
        }
    }

    const resultado = {
        db: base,
        paciente
    };
    return resultado;
}

