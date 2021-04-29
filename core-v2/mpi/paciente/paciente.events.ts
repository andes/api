import { EventCore } from '@andes/event-bus';
import { logPaciente } from '../../../core/log/schemas/logPaciente';
import { restorePrestacionPatientData, updatePrestacionPatientData } from '../../../modules/rup/controllers/prestacion';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { linkPacientesDuplicados, updateGeoreferencia } from './paciente.controller';
import { IPacienteDoc } from './paciente.interface';

// TODO: Handlear errores
EventCore.on('mpi:pacientes:create', async (paciente: IPacienteDoc) => {
    if (paciente.estado === 'validado') {
        const patientRequest = {
            user: paciente.createdBy,
            ip: 'localhost',
            connection: {
                localAddress: ''
            },
            body: paciente
        };
        if (paciente.direccion?.length) {
            await updateGeoreferencia(paciente);
        }
        await linkPacientesDuplicados(patientRequest, paciente);
        // si el paciente tiene algun reporte de error, verificamos que sea nuevo
        if (paciente.reportarError) {
            LoggerPaciente.logReporteError(patientRequest, 'error:reportar', paciente, paciente.notaError);
        }
    }
});

EventCore.on('mpi:pacientes:update', async (paciente: any, changeFields: string[]) => {
    try {
        const patientRequest = {
            user: paciente.updatedBy,
            ip: 'localhost',
            connection: {
                localAddress: ''
            },
            body: paciente
        };
        const addressChanged = changeFields.includes('direccion');

        if (addressChanged) {
            await updateGeoreferencia(paciente);
        }
        if (paciente.estado === 'validado') {
            // si el paciente tiene algun reporte de error, verificamos que sea nuevo
            if (paciente.reportarError) {
                const reportes = await logPaciente.find({ paciente: paciente.id, operacion: 'error:reportar' });
                if (!reportes.some((rep: any) => rep.error === paciente.notaError)) {
                    LoggerPaciente.logReporteError(patientRequest, 'error:reportar', paciente, paciente.notaError);
                }
            }

        }
    } catch (error) {
        return error;
    }
});

EventCore.on('mpi:pacientes:link', async (paciente) => {
    if (paciente.estado === 'validado' && paciente.activo) {
        await updatePrestacionPatientData(paciente);
    }
    if (paciente.estado === 'temporal' && paciente.activo) {
        await restorePrestacionPatientData(paciente);
    }
});
