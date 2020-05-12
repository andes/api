import { userScheduler } from '../../../config.private';
import { paciente } from '../schemas/paciente';
import { updatePaciente } from './paciente';
import { log as andesLog } from '@andes/log';
import { logKeys } from '../../../config';
import { sisa, sisaToAndes } from '@andes/fuentes-autenticas';
import { sisa as sisaConfig } from '../../../config.private';
import * as config from '../../../config';
import { Matching } from '@andes/match';

let logRequest = {
    ip: userScheduler.ip,
    user: {
        usuario: {
            nombre: 'MPICorrectorJob'
        }
    },
    connection: userScheduler.connection,
    logKey: logKeys.mpiCorrector.key,
    logOperation: logKeys.mpiCorrector.operacion,
    body: undefined
};

/**
 * Corrije nombre y apellido de los pacientes reportados con errores
 *  durante el escaneo del código QR del dni
 *
 * @export
 * @returns {Any}
 */
export async function mpiCorrector(done) {
    const condicion = {
        reportarError: true
    };
    try {
        const pacientesReportados = await paciente.find(condicion);
        let doc: any;
        for (doc of pacientesReportados) {
            await consultarSisa(doc);
        }
    } catch (err) {
    }
    done();
}

async function consultarSisa(persona: any) {
    try {
        const pacienteSisa = await sisa(persona, sisaConfig, sisaToAndes);

        if (pacienteSisa) {
            let match = new Matching();
            const weights = config.mpi.weightsDefault;
            const valorMatching = match.matchPersonas(persona, pacienteSisa, weights, config.algoritmo); // Valor del matcheo de sisa

            if (valorMatching >= 0.95) {
                // Solo lo validamos con sisa si entra por aquí
                const datosAnteriores = { nombre: persona.nombre, apellido: persona.apellido };
                const nuevosDatos = { nombre: pacienteSisa.nombre, apellido: pacienteSisa.apellido };
                await actualizarPaciente(persona, pacienteSisa);
                await andesLog(logRequest, logKeys.mpiCorrector.key, persona.id, logKeys.mpiCorrector.operacion, nuevosDatos, datosAnteriores);
                return true;
            } else {
                const data = {
                    reportarError: 'false',
                };
                await updatePaciente(persona, data, logRequest);
                await andesLog(logRequest, logKeys.mpiCorrector.key, persona._id, logKeys.mpiCorrector.operacion, null, null, 'matching: ' + match);
            }
        }
        return false;
    } catch (err) {
        await andesLog(logRequest, logKeys.mpiCorrector.key, persona._id, logKeys.mpiCorrector.operacion, null, null, 'Error actualizando paciente');
        return false;
    }
}

function actualizarPaciente(pacienteMpi: any, pacienteSisa: any) {
    if (!pacienteMpi.entidadesValidadoras.includes('Sisa')) {
        // Para que no vuelva a insertar la entidad si ya se registro por ella.
        pacienteMpi.entidadesValidadoras.push('Sisa');
    }
    const data = {
        nombre: pacienteSisa.nombre,
        apellido: pacienteSisa.apellido,
        reportarError: false,
        notaError: '',
        entidadesValidadoras: pacienteMpi.entidadesValidadoras
    };
    // PUT de paciente en MPI
    return updatePaciente(pacienteMpi, data, logRequest);
}

