import { InscripcionVacuna } from '../modules/vacunas/schemas/inscripcion-vacunas.schema';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { PacienteCtr } from '../core-v2/mpi';

// Recorre todas las prestaciones de vacuna y agrega la fecha e id en la colección de inscripción.
async function ActualizarInscripciones() {
    const inscripciones = InscripcionVacuna.find({ fechaVacunacion: { $exists: false }, 'paciente.id': { $exists: true } }).cursor({ batchSize: 100 });
    for await (const inscripcion of inscripciones) {
        // Se buscan los temporales asociados al paciente
        const pacientes = await PacienteCtr.search({ documento: inscripcion.documento, sexo: inscripcion.sexo });
        let identificadores = [];
        for (const paciente of pacientes) {
            const pacienteInscripto = paciente.toObject({ virtuals: true });
            identificadores = identificadores.concat(pacienteInscripto.vinculos);
        }
        if (!inscripcion.fechaVacunacion || !inscripcion.idPrestacionVacuna) {
            const prestaciones: any[] = await Prestacion.find({ 'ejecucion.registros.concepto.conceptId': '840534001', 'paciente.id': { $in: identificadores } });
            if (prestaciones.length) {
                try {
                    await InscripcionVacuna.updateOne({ _id: inscripcion.id }, { $set: { fechaVacunacion: prestaciones[0].ejecucion.fecha, idPrestacionVacuna: prestaciones[0].id } });
                } catch (e) {
                    return;
                }
            }
        }
    }
}

async function run(done) {
    await ActualizarInscripciones();
    done();
}

export = run;
