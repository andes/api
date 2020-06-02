import { Paciente } from './paciente.schema';
import { Auth } from '../../../auth/auth.class';
import * as moment from 'moment';
import { Matching } from '@andes/match';
import { IPacienteDoc, IPaciente } from './paciente.interface';
import * as express from 'express';
import * as config from '../../../config';


/**
 * Crea un objeto paciente
 */

export function newPaciente(body: IPaciente) {
    const paciente = new Paciente();
    paciente.set(body);
    return paciente;
}

/**
 * Guarda un objecto paciente en mongo.
 *
 * @param {IPacienteDoc} body Datos del paciente
 * @param {express.Request} req Request de Express para obtener los datos del usuario
 */

export async function storePaciente(paciente/*: IPacienteDoc*/, req: express.Request) {
    const session = await Paciente.db.startSession();
    session.startTransaction();
    const isNew = paciente.isNew;
    try {
        const pacienteOriginal = paciente.original();
        const pacienteFields = paciente.modifiedPaths();

        Auth.audit(paciente, req);
        await paciente.save({ session });

        if (isNew) {
            //     log(req, logKeys.mpiInsert.key, paciente._id, logKeys.mpiInsert.operacion, paciente, null);
            await session.commitTransaction();
        } else {
            //     log(req, logKeys.mpiUpdate.key, paciente._id, logKeys.mpiUpdate.operacion, paciente, pacienteOriginal);
            await session.commitTransaction();
        }
        return paciente;
    } catch (error) {
        if (isNew) {
            //          log(req, logKeys.mpiInsert.key, null, logKeys.mpiInsert.operacion, paciente, 'Error insertando paciente');
        } else {
            //          log(req, logKeys.mpiUpdate.key, paciente._id, logKeys.mpiUpdate.operacion, null, 'Error actualizando paciente');
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

export function updatePaciente(paciente/*: IPacienteDoc*/, body: any) {
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
 * Busca paciente similares a partir de su documento
 * Devuelve una lista de pacientes ordenada por score de forma descendente
 *
 * @param {object} query Condiciones a buscar
 *
 * [TODO] Definir el tipado de esta funcion
 */

export async function suggest(query: any) {
    if (query && query.documento) {
        let pacientes = await Paciente.fuzzySearch({ query: query.documento, minSize: 7 }, { activo: { $eq: true } });

        pacientes.forEach((paciente) => {
            const value = matching(paciente, query);
            paciente._score = value;
        });

        const sortScore = (a, b) => {
            return b._score - a._score;
        };

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

/**
 * Chequea si hay algun paciente con maching superior a la cota maxima de aceptacion.
 */

export function isMatchingAlto(sugeridos: any[]) {
    return sugeridos.some((paciente) => paciente._score > config.mpi.cotaMatchMax);
}
