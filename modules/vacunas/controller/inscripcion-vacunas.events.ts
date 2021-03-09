import { EventCore } from '@andes/event-bus';
import { Request } from '@andes/api-tool';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { provincia as provinciaActual } from '../../../config.private';
import { PersonalSaludCtr } from '../../../modules/personalSalud/personal-salud.routes';
import { findOrCreate } from '../../../core-v2/mpi/paciente/paciente.controller';
import { InscripcionVacunasCtr } from '../inscripcion-vacunas.routes';
import { replaceChars } from '../../../core-v2/mpi';

EventCore.on('vacunas:inscripcion-vacunas:create', async (inscripto: any, inscriptoValidado: any, req: Request) => {
    if (inscripto.grupo && inscripto.grupo.nombre === 'personal-salud') {
        inscripto.personal_salud = true;
        inscripto.estado = 'habilitado';
        const profesional = await Profesional.findOne({ documento: inscripto.documento, sexo: inscripto.sexo }, { nombre: true, apellido: true });
        if (!profesional) {
            // Busco si es personal de salud
            const personal = await PersonalSaludCtr.findOne({ documento: inscripto.documento });
            if (!personal) {
                inscripto.personal_salud = false;
                inscripto.estado = 'pendiente';
            }
        }
    }
    // Verifica el domicilio del paciente
    if (inscriptoValidado) {
        const provincia = provinciaActual || 'neuquen';
        const provinciaInscripto = inscriptoValidado.direccion[0].ubicacion.provincia.nombre || '';
        if (replaceChars(provinciaInscripto).toLowerCase() === replaceChars(provincia)) {
            inscripto.validaciones.push('domicilio');
        } else {
            if (inscripto.grupo && inscripto.grupo.nombre === 'mayores60') {
                inscripto.estado = 'pendiente';
            }
        }
        // Busca el paciente y si no existe lo guarda
        const paciente = await findOrCreate(inscriptoValidado, req);
        if (paciente && paciente.id) {
            inscripto.paciente.id = paciente.id;
            inscripto.paciente.addAt = new Date();
        }
    }

    await InscripcionVacunasCtr.update(inscripto.id, inscripto, req);

});

// Al validar la prestacion de vacunacion, inserta la fecha de vacunacion en la inscripcion
EventCore.on('vacunas:inscripcion:vacunado', async ({ prestacion }, req: Request) => {
    const inscripto = await InscripcionVacunasCtr.findOne({ idPaciente: prestacion.paciente.id });
    if (inscripto) {
        inscripto.fechaVacunacion = prestacion.ejecucion.fecha;
        inscripto.idPrestacionVacuna = prestacion._id;
        await InscripcionVacunasCtr.update(inscripto.id, inscripto, req);
    }
});

// Quita la fecha de vacunacion si se rompe la validacion
EventCore.on('vacunas:inscripcion:cancelar-vacunado', async ({ prestacion }, req: Request) => {
    const inscripto = await InscripcionVacunasCtr.findOne({ idPaciente: prestacion.paciente.id });
    if (inscripto) {
        inscripto.fechaVacunacion = null;
        inscripto.idPrestacionVacuna = null;
        await InscripcionVacunasCtr.update(inscripto.id, inscripto, req);
    }
});

