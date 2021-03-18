import { InscripcionVacuna } from '../modules/vacunas/schemas/inscripcion-vacunas.schema';
import { userScheduler } from '../config.private';
import { InscripcionVacunasCtr } from '../modules/vacunas/inscripcion-vacunas.routes';
import { validar } from './../core-v2/mpi/validacion';
import { matching } from '../core-v2/mpi/paciente/paciente.controller';
import { mpi } from '../config';
import { EventCore } from '@andes/event-bus/';
import { provincia as provinciaActual } from '../config.private';
import { findOrCreate, } from './../core-v2/mpi/paciente/paciente.controller';
import { replaceChars } from './../core-v2/mpi';

let dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

async function run(done) {
    const cursor = InscripcionVacuna.find({ validado: false, fechaValidacion: { $exists: false }, 'paciente.id': { $exists: false } }).cursor({ batchSize: 1000 });

    const validarInscriptos = async (inscripto) => {
        try {
            let inscripcion = inscripto;
            const inscriptoValidado = await validar(inscripto.documento, inscripto.sexo);
            if (inscriptoValidado) {
                inscripcion.fechaValidacion = new Date();
                inscripcion.validado = true;
                if (inscriptoValidado.direccion[0].ubicacion.localidad) {
                    inscripcion.localidad = {
                        id: inscriptoValidado.direccion[0].ubicacion.localidad._id,
                        nombre: inscriptoValidado.direccion[0].ubicacion.localidad.nombre
                    };

                    const provincia = provinciaActual || 'neuquen';
                    const provinciaInscripto = inscriptoValidado.direccion[0].ubicacion.provincia.nombre || '';
                    if (replaceChars(provinciaInscripto).toLowerCase() === replaceChars(provincia)) {
                        inscripcion.validaciones.push('domicilio');
                    }
                }
                const value = await matching(inscriptoValidado, inscripcion);
                if (value < mpi.cotaMatchMax) {
                    inscripcion.validado = false;
                } else {
                    const paciente = await findOrCreate(inscriptoValidado, dataLog);
                    if (paciente && paciente.id) {
                        inscripcion.paciente = {
                            id: paciente.id,
                            addAt: new Date()
                        };
                    }
                }
                // Busca el paciente y si no existe lo guarda
            }
            const nuevaInscripcion = await InscripcionVacunasCtr.update(inscripcion._id, inscripcion, dataLog);
            EventCore.emitAsync('vacunas:inscripcion-vacunas:create', nuevaInscripcion, inscriptoValidado, dataLog);

        } catch (error) {
            return;
        }
    };

    await cursor.eachAsync(async (inscripto: any) => {
        await validarInscriptos(inscripto);
    });
    done();
}

export = run;
