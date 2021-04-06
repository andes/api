import { InscripcionVacuna } from './../modules/vacunas/schemas/inscripcion-vacunas.schema';
import { Prestacion } from './../modules/rup/schemas/prestacion';

// Recorre todas las prestaciones de vacuna y agrega la fecha e id en la colección de inscripción.
async function ActualizarInscripciones() {
    const inscripciones: any[] = await InscripcionVacuna.find({fechaVacunacion: {$exists: false}, 'paciente.id': {$exists: true}});
    for (const inscripcion of inscripciones) {
        if (!inscripcion.fechaVacunacion || !inscripcion.idPrestacionVacuna) {
            const prestaciones: any[] = await Prestacion.find({ 'ejecucion.registros.concepto.conceptId': '840534001', 'paciente.id': inscripcion.paciente.id });
            if (prestaciones.length) {
                try {
                    await InscripcionVacuna.updateOne( { _id: inscripcion.id} , { $set: { fechaVacunacion: prestaciones[0].ejecucion.fecha, idPrestacionVacuna: prestaciones[0].id} });
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
