import { EventCore } from '@andes/event-bus';
import { InscripcionVacunasCtr } from '../inscripcion-vacunas.routes';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { vacunasApi } from '../schemas/vacunasApi';

EventCore.on('vacunas:prestaciones:validate', async (prestacion) => {
    const inscripcionVacuna = await InscripcionVacunasCtr.findOne({ idPaciente: prestacion.paciente.id });
    const pacienteMpi = await PacienteCtr.findById(prestacion.paciente.id);

    const prestacionAsociada = {
        id: prestacion.id,
        fecha: prestacion.ejecucion.fecha,
        tipoPrestacion: prestacion.solicitud.tipoPrestacion.term
    };

    const dtoVacuna = new vacunasApi({
        documento: pacienteMpi.documento,
        apellido: pacienteMpi.apellido,
        nombre: pacienteMpi.nombre,
        fechaNacimiento: pacienteMpi.fechaNacimiento,
        sexo: pacienteMpi.sexo,
        vacuna: prestacion.ejecucion.registros.valor,
        fechaAplicacion: prestacion.ejecucion.fecha,
        efector: prestacion.solicitud.organizacion.nombre,
        paciente: {
            id: pacienteMpi.id,
            zona: pacienteMpi.direccion,
            contacto: pacienteMpi.contacto
        },
        prestacionesAsociadas: prestacionAsociada,
        profesional: prestacion.solicitud.profesional,
        inscripcion: inscripcionVacuna
    });

    await dtoVacuna.save();
});
