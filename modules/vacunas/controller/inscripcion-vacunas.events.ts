import { EventCore } from '@andes/event-bus';
import { Request } from '@andes/api-tool';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { provincia as provinciaActual } from '../../../config.private';
import { PersonalSaludCtr } from '../../../modules/personalSalud/personal-salud.routes';
import { findOrCreate, extractFoto } from '../../../core-v2/mpi/paciente/paciente.controller';
import { InscripcionVacunasCtr } from '../inscripcion-vacunas.routes';
import { replaceChars } from '../../../core-v2/mpi';
import { userScheduler } from '../../../config.private';
let dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

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
        await extractFoto(inscriptoValidado, dataLog);
        const paciente = await findOrCreate(inscriptoValidado, dataLog);
        if (paciente && paciente.id) {
            inscripto.paciente = paciente;
            inscripto.paciente.id = paciente.id;
        }
    }

    await InscripcionVacunasCtr.update(inscripto.id, inscripto, dataLog);

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

// Al validar la prestacion de certificación de paciente con riesgo aumentado de COVID-19, inserta la fecha de certificado en la inscripcion
EventCore.on('vacunas:inscripcion:certificado', async ({ prestacion }) => {
    const inscripto = await InscripcionVacunasCtr.findOne({ idPaciente: prestacion.paciente.id });
    if (inscripto) {
        inscripto.fechaCertificado = prestacion.ejecucion.fecha;
        inscripto.idPrestacionCertificado = prestacion._id;
        await InscripcionVacunasCtr.update(inscripto.id, inscripto, dataLog);
    }
});

// Quitar la fecha de certificado si se rompe la validación
EventCore.on('vacunas:inscripcion:cancelar-certificado', async ({ prestacion }) => {
    const inscripto = await InscripcionVacunasCtr.findOne({ idPaciente: prestacion.paciente.id });
    if (inscripto) {
        inscripto.fechaCertificado = null;
        inscripto.idPrestacionCertificado = null;
        await InscripcionVacunasCtr.update(inscripto.id, inscripto, dataLog);
    }
});
