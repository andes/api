import { EventCore } from '@andes/event-bus';
import { getConfigHl7 } from './hl7v2-config.controller';
import { IHL7v2Config, HL7v2Config } from './hl7v2-config.schema';
import { hl7v2NetworkController } from './hl7v2-network.controller';
import { adt04Hl7v2Log } from './hl7v2Log';
import { userScheduler } from '../../config.private';
import * as mongoose from 'mongoose';
import { PacienteCtr } from '../../core-v2/mpi/paciente/paciente.routes';
import * as moment from 'moment';

export async function adt04(turno: any) {
    const organizacion = turno.updatedBy.organizacion;
    const tipoPrestacion = turno.tipoPrestacion;
    const tipoMensaje = 'adt04';
    const idPaciente = mongoose.Types.ObjectId(turno.paciente.id);
    const paciente = await PacienteCtr.findById(idPaciente);

    const direccionCompleta = {
        direccion: paciente.direccion[0]?.valor || '',
        localidad: paciente.direccion[0]?.ubicacion?.localidad?.nombre || '',
        provincia: paciente.direccion[0]?.ubicacion?.provincia?.nombre || '',
    };


    const pacienteSubconjunto = {
        id: turno.paciente.id,
        nombre: turno.paciente.nombre,
        apellido: turno.paciente.apellido,
        documento: turno.paciente.documento,
        direccion: direccionCompleta.direccion,
        localidad: direccionCompleta.localidad,
        provincia: direccionCompleta.provincia,
        fechaNacimiento: moment(turno.paciente.fechaNacimiento).format('YYYYMMDD'),
        sexo: turno.paciente.sexo === 'masculino' ? 'M' : 'F',
        telefono: turno.paciente.telefono,
    };

    console.log(pacienteSubconjunto)

    if (!tipoPrestacion) {
        return;
    };
    // console.log(organizacion);
    // console.log(tipoPrestacion);
    // console.log(tipoMensaje)
    try {
        const config: IHL7v2Config = await getConfigHl7(organizacion.id, tipoPrestacion.conceptId, tipoMensaje);
        // console.log(config)
        if (config) {
            // Enviar mensaje
            const sendError = await hl7v2NetworkController.sendMessageHl7v2(
                pacienteSubconjunto,
                config.queueName,
                config.queueConnectionString
            );
            if (sendError) {
                await HL7v2Config.updateOne(
                    { _id: config.id },
                    { $push: { deadLetterQueue: { ...pacienteSubconjunto, error: sendError, fecha: moment().toISOString() } } }
                );
                adt04Hl7v2Log.error(
                    'citas:turno:asignar',
                    {
                        error: sendError,
                        tipoMensaje,
                        paciente: pacienteSubconjunto,
                        organizacionid: organizacion.id,
                        tipoPrestacion: tipoPrestacion.conceptId
                    },
                    { error: 'Error con el sistema de Colas' },
                    userScheduler
                );
            }
        };
    } catch (error) {
        adt04Hl7v2Log.error(
            'citas:turno:asignar',
            {
                error: error.message,
                tipoMensaje,
                paciente: pacienteSubconjunto,
                organizacionid: organizacion.id,
                tipoPrestacion: tipoPrestacion.conceptId
            },
            { error: 'Error cargando configuracion desde la BD' },
            userScheduler
        );
    }
};

EventCore.on('citas:turno:asignar', async (turno) =>{
    adt04(turno);
});
