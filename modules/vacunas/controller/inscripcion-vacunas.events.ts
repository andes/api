import { EventCore } from '@andes/event-bus';
import { InscripcionVacunasCtr } from '../inscripcion-vacunas.routes';
import { userScheduler } from '../../../config.private';
import { validarInscripcion } from './inscripcion.vacunas.controller';
const dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

EventCore.on('vacunas:inscripcion-vacunas:create', async (inscripto: any, inscriptoValidado: any) => {
    if (inscripto.numeroIdentificacion === '') {
        const inscripcion = await validarInscripcion(inscripto, inscriptoValidado, dataLog);
        await InscripcionVacunasCtr.update(inscripcion.id, inscripcion, dataLog);
    }
});

// Al validar la prestacion de vacunacion, inserta la fecha de vacunacion en la inscripcion
EventCore.on('vacunas:inscripcion:vacunado', async ({ prestacion }) => {
    const inscripto = await InscripcionVacunasCtr.findOne({ idPaciente: prestacion.paciente.id });
    if (inscripto) {
        inscripto.fechaVacunacion = prestacion.ejecucion.fecha;
        inscripto.idPrestacionVacuna = prestacion._id;
        await InscripcionVacunasCtr.update(inscripto.id, inscripto, dataLog);
    }
});

// Quita la fecha de vacunacion si se rompe la validacion
EventCore.on('vacunas:inscripcion:cancelar-vacunado', async ({ prestacion }) => {
    const inscripto = await InscripcionVacunasCtr.findOne({ idPaciente: prestacion.paciente.id });
    if (inscripto) {
        inscripto.fechaVacunacion = null;
        inscripto.idPrestacionVacuna = null;
        await InscripcionVacunasCtr.update(inscripto.id, inscripto, dataLog);
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
