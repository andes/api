import { EventCore } from '@andes/event-bus';
import { getConfigHl7 } from './hl7v2-config.controller';
import { IHL7v2Config, HL7v2Config } from './hl7v2-config.schema';
import { hl7v2NetworkController } from './hl7v2-network.controller';
import { adt04Hl7v2Log } from './hl7v2Log';
import { userScheduler } from '../../config.private';
import * as moment from 'moment';

export async function adt04(turno: any) {
    const organizacion = turno.updatedBy.organizacion;
    const tipoPrestacion = turno.tipoPrestacion;

    if (!tipoPrestacion) {
        return;
    }

    try {
        // console.log(organizacion.id);
        // console.log(tipoPrestacion.conceptId);
        const config: IHL7v2Config = await getConfigHl7(organizacion.id, tipoPrestacion.conceptId, 'adt04');
        // console.log(config);
        if (config) {
            // console.log('Hl7 Config:', config);
            const pacienteSubconjunto = {
                id: turno.paciente.id,
                nombre: turno.paciente.nombre,
                apellido: turno.paciente.apellido,
                documento: turno.paciente.documento,
                fechaNacimiento: moment(turno.paciente.fechaNacimiento).format('YYYYMMDD'),
                sexo: turno.paciente.sexo === 'masculino' ? 'M' : 'F',
                telefono: turno.paciente.telefono,
            };
            //  console.log(pacienteSubconjunto);
            try {
                // Enviar mensaje
                await hl7v2NetworkController.sendMessageHl7v2(
                    pacienteSubconjunto,
                    config.queueName,
                    config.queueConnectionString
                );
            } catch (error) {
                // console.error('Error al enviar mensaje o cerrar conexión:', error);
                adt04Hl7v2Log.error('citas:turno:asignar', { sendMsgToQueue: error }, { error: 'Error with queue system' }, userScheduler);
            }
        }
    } catch (error) {
        adt04Hl7v2Log.error('citas:turno:asignar', { sendMsgToQueue: error }, { error: 'Error retrieving conf from DB' }, userScheduler);
    }
};

EventCore.on('citas:turno:asignar', async (turno) =>{
    // console.log(turno)
    adt04(turno);
});
