import { userScheduler } from '../../../config.private';
import * as pacienteModel from '../schemas/paciente';
import { matchSisa } from '../../../utils/servicioSisa';
import * as controllerPaciente from './paciente';
import * as debug from 'debug';

const logger = debug('mpiCorrector');

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
        const pacientesReportados = await pacienteModel.pacienteMpi.find(condicion);
        let doc: any;
        logger('llamada mpiCorrector ', pacientesReportados.length);
        for (doc of pacientesReportados) {
            logger('llamada con ', doc.documento);
            await consultarSisa(doc);
        }
    } catch (err) {
        logger('Error', err);
    }
    logger('Proceso finalizado');
    done();
}

async function consultarSisa(pacienteMpi: any) {
    try {
        logger('Inicia Consulta Sisa', pacienteMpi.documento);
        // realiza la consulta con sisa y devuelve los resultados del matcheo
        const resultado = await matchSisa(pacienteMpi);


        if (resultado) {
            const match = resultado['matcheos'].matcheo; // Valor del matcheo de sisa
            const pacienteSisa = resultado['matcheos'].datosPaciente; // paciente con los datos de Sisa originales
            if (match >= 95) {
                // Solo lo validamos con sisa si entra por aquí
                await actualizarPaciente(pacienteMpi, pacienteSisa);
                return true;
            } else {
                // POST/PUT en una collection pacienteRejected para un control a posteriori
                // nuevoPacienteRejected(pacienteMpi);
                const data = {
                    reportarError: 'false',
                };
                await controllerPaciente.updatePaciente(pacienteMpi, data, userScheduler);
            }
        }
        return false;
    } catch (err) {
        logger('Error', err);
        return false;
    }
}

/*
[REVISAR]
function nuevoPacienteRejected(pacienteAndes: any) {
    let pacienteMatch = new pacienteRejected();
    pacienteMatch.id = pacienteAndes._id;
    pacienteMatch['documento'] = pacienteAndes.documento;
    pacienteMatch['nombre'] = pacienteAndes.nombre;
    pacienteMatch['apellido'] = pacienteAndes.apellido;
    pacienteMatch['sexo'] = pacienteAndes.sexo;
    pacienteMatch['fechaNacimiento'] = pacienteAndes.fechaNacimiento;
    pacienteRejected.findById(pacienteAndes.id).then((pac) => {
        if (pac) {
            pacienteMatch = pac;
        }
        pacienteMatch['porcentajeMatch'] = [{
            entidad: 'Sisa',
            match: pacienteAndes.matchSisa
        }];
        pacienteMatch.save()
            .catch(err => {
                logger('Error', err);
            });
        // Flag reportarError en false para que no se consulte infinitamente el con pacientes que no dan match
        let data = {
            reportarError: 'false',
        };
        controllerPaciente.updatePaciente(pacienteAndes, data, userScheduler)
            .catch(err => {
                logger('Error', err);
                return err;
            });
    }).catch(err => {
        logger('Error', err);
        return err;
    });
}

*/
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
    return controllerPaciente.updatePaciente(pacienteMpi, data, userScheduler);
}

