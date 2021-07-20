import { EventCore } from '@andes/event-bus';
import { Types } from 'mongoose';
import { logPaciente } from '../../../core/log/schemas/logPaciente';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { updatePrestacionPatient } from './../../../modules/rup/controllers/prestacion';
import { findById, linkPacientesDuplicados, updateGeoreferencia } from './paciente.controller';
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
    // Verifica si se realizó alguna operación de vinculación de pacientes
    const vinculado = changeFields.includes('idPacientePrincipal');
    if (vinculado && paciente.idPacientePrincipal) {

        EventCore.emitAsync('mpi:pacientes:link', {
            target: new Types.ObjectId(paciente.idPacientePrincipal),
            source: new Types.ObjectId(paciente.id)
        });

        const pacienteVinculado = await findById(paciente.idPacientePrincipal);
        await updatePrestacionPatient(pacienteVinculado, paciente.id, paciente.idPacientePrincipal);
    }
    if (vinculado && paciente.idPacientePrincipal === null && paciente.activo) {
        EventCore.emitAsync('mpi:pacientes:unlink', {
            target: new Types.ObjectId(paciente._original.idPacientePrincipal),
            source: new Types.ObjectId(paciente.id)
        });
        await updatePrestacionPatient(paciente, paciente.id, null);
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

