import { EventCore } from '@andes/event-bus';
import { IPacienteDoc } from './paciente.interface';
import * as PacienteRts from './paciente.routes';
import { logPaciente } from '../../../core/log/schemas/logPaciente';
import { LoggerPaciente } from '../../../utils/loggerPaciente';

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
            await PacienteRts.updateGeoreferencia(paciente);
        }
        // si el paciente tiene algun reporte de error, verificamos que sea nuevo
        if (paciente.reportarError) {
            LoggerPaciente.logReporteError(patientRequest, 'error:reportar', paciente, paciente.notaError);
        }
    }
});

EventCore.on('mpi:pacientes:update', async (paciente: any, changeFields: string[]) => {
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
        await PacienteRts.updateGeoreferencia(paciente);
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
});
