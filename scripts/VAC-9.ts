import { InscripcionVacuna } from './../modules/vacunas/schemas/inscripcion-vacunas.schema';
import { Prestacion } from './../modules/rup/schemas/prestacion';

// Recorre todas las derivaciones y sus adjuntos migrando aquellos que no se encuentran en el  drive
async function ActualizarInscripciones() {
    const inscripciones: any[] = await InscripcionVacuna.find({});
    for (const inscripcion of inscripciones) {
        if (!inscripcion.fechaVacunacion || !inscripcion.idPrestacionVacuna) {
            const prestaciones: any[] = await Prestacion.find({ 'ejecucion.registros.concepto.conceptId': '840534001', 'paciente.id': inscripcion.paciente.id });
            if (prestaciones.length) {
                try {
                    inscripcion.fechaVacunacion = prestaciones[0].ejecucion.fecha;
                    inscripcion.idPrestacionVacuna = prestaciones[0].id;
                    await inscripcion.save();
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
