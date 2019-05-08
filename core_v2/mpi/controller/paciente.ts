import {Paciente, PacienteMpi} from '../schemas/paciente';
import * as mongoose from 'mongoose';
import * as express from 'express';
import {Connections} from '../../../connections';
import { Auth } from '../../../auth/auth.class';
import { ElasticSync } from '../../../utils/elasticSync';
import { log } from '@andes/log';
import { logKeys } from '../../../config';
import { EventCore } from '@andes/event-bus';

export async function createPaciente(body, req: express.Request) {
    const session = await Connections.main.startSession();
    session.startTransaction();
    try {
        const paciente = new Paciente(body);
        Auth.audit(paciente, req);
        await paciente.save({ session});

        const connElastic = new ElasticSync();
        await connElastic.create(paciente._id.toString(), (paciente as any).toElastic());
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
    const session = await Connections.main.startSession();
    session.startTransaction();
    try {
        const pacienteOriginal = paciente.toObject();
        const pacienteFields = paciente.modifiedPaths();
        Auth.audit(paciente, req);
        await paciente.save({ session});
        if (paciente.sincroniza(pacienteFields)) {
            const connElastic = new ElasticSync();
            await connElastic._sync(paciente.id, paciente);
        }
        EventCore.emitAsync('mpi:patient:update', paciente, pacienteFields);
        log(req, logKeys.mpiUpdate.key, paciente._id, logKeys.mpiUpdate.operacion, paciente, pacienteOriginal);
        session.commitTransaction();

    } catch (error) {
        log(req, logKeys.mpiUpdate.key, req.body._id, logKeys.mpiUpdate.operacion, null, 'Error actualizando paciente');
        session.abortTransaction();
        throw error;
    }

}

export async function findById(id: string | String | mongoose.Types.ObjectId) {
    let base = 'andes';
    let paciente = await Paciente.findById(id);
    if (!paciente) {
        base = 'mpi';
        paciente = await PacienteMpi.findById(id);
    }
    const resultado = {
        db: base,
        paciente
    };
    return resultado;
}

