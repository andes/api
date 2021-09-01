import { userScheduler } from '../../../config.private';
import { PacienteCtr } from '../paciente/paciente.routes';
import { mpiCorrectorLog } from '../mpi.log';
import { sisa, sisaToAndes } from '@andes/fuentes-autenticas';
import { sisa as sisaConfig } from '../../../config.private';
import * as config from '../../../config';
import { Matching } from '@andes/match';
const logMpiCorrector = mpiCorrectorLog.startTrace();

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
        const pacientesReportados = await PacienteCtr.search(condicion);
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
            const match = new Matching();
            const weights = config.mpi.weightsDefault;
            const valorMatching = match.matchPersonas(persona, pacienteSisa, weights, config.algoritmo); // Valor del matcheo de sisa
            const datosAnteriores = { nombre: persona.nombre, apellido: persona.apellido };
            if (valorMatching >= 0.95) {
                // Solo lo validamos con sisa si entra por aquí
                const nuevosDatos = { nombre: pacienteSisa.nombre, apellido: pacienteSisa.apellido };
                await actualizarPaciente(persona, pacienteSisa);
                await logMpiCorrector.info('update', nuevosDatos, userScheduler);
                return true;
            } else {
                const data = {
                    reportarError: 'false',
                };
                await PacienteCtr.update(persona.id, data, userScheduler as any);
                await logMpiCorrector.info('bajo matching' + match, datosAnteriores, userScheduler);
            }
        }
        return false;
    } catch (err) {
        await logMpiCorrector.error('mpi-corrector', persona, err, userScheduler);
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
    return PacienteCtr.update(pacienteMpi.id, data, userScheduler as any);
}

