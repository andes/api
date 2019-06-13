import { EventCore } from '@andes/event-bus';
import { IPacienteDoc } from './paciente.interface';
import { direccionController } from './direcciones/direccion.controller';
import { PacienteCtr } from './paciente.controller';
import { userScheduler } from '../../../config.private';

EventCore.on('mpi:patient:create', async (paciente: IPacienteDoc) => {
    await direccionController.geoRefDirecciones(paciente);
    await PacienteCtr.store(paciente, userScheduler as any, false);
});

EventCore.on('mpi:patient:update', async (paciente: IPacienteDoc, changeFields: string[]) => {
    const addressChanged = changeFields.indexOf('direccion') >= 0;
    if (addressChanged) {
        await direccionController.geoRefDirecciones(paciente);
        await PacienteCtr.store(paciente, userScheduler as any, false);
    }
});
