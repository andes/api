import { Hl7ConfigController } from './hl7v2-config.controller';
import { EventCore } from '@andes/event-bus';
import { hl7v2NetworkController } from './hl7v2-network.controller';

export async function adt04(turno: any) {
    const organizacionId = turno.updatedBy.organizacion;
    const tipoPrestacionId = turno.tipoPrestacion.term;

    try {
        const config = await Hl7ConfigController.getConfig(organizacionId, tipoPrestacionId, 'adt04');

        if (config) {
            // console.log('Hl7 Config:', config);
            const pacienteSubconjunto = {
                id: turno.paciente.id,
                nombre: turno.paciente.nombre,
                documento: turno.paciente.documento,
                fechaNacimiento: turno.paciente.fechaNacimiento
            };
            try {
                // Enviar mensaje
                await hl7v2NetworkController.sendMessageHl7v2(
                    pacienteSubconjunto,
                    config.queueName,
                    config.queueConnectionString
                );
            } catch (error) {
                console.error('Error al enviar mensaje o cerrar conexión:', error);
            }
        } else {
            console.error('No se encontró la configuración de hl7.');
        }
    } catch (error) {
        console.error('Error al obtener la configuración de hl7:', error);
    }
};

EventCore.on('citas:turno:asignar', async (turno) =>{
    // console.log(turno)
    adt04(turno);
    // console.log(paciente)
});
