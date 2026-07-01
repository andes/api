import { EventCore } from '@andes/event-bus';
import { getProfesionActualizada, crearReceta } from '../../recetas/recetasController';
import * as moment from 'moment';
import { Receta } from '../../recetas/receta-schema';
import { RecetaControl } from '../../recetas/receta-control-schema';
import { rupEventsLog as logger } from './rup.events.log';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { generarCUIL } from '../../../core-v2/mpi/validacion/validacion.controller';
import { Organizacion } from '../../../core/tm/schemas/organizacion';

EventCore.on('prestacion:receta:create', async ({ prestacion, registro }) => {
    try {
        const idRegistro = registro._id;
        const documentoProfesional = prestacion.estadoActual.createdBy?.documento ? prestacion.estadoActual.createdBy?.documento : prestacion.solicitud.profesional.documento;
        const profPrestacion = await Profesional.findOne({ documento: documentoProfesional });
        if (!profPrestacion) {
            logger.error('prestacion:receta:create', prestacion, `No se encontró el profesional con documento ${documentoProfesional}`);
            return;
        }
        const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profPrestacion);

        const profesional = {
            id: profPrestacion.id,
            nombre: profPrestacion.nombre,
            apellido: profPrestacion.apellido,
            documento: profPrestacion.documento,
            profesion: profesionGrado,
            especialidad: especialidades,
            matricula: matriculaGrado
        };

        if (prestacion.ejecucion.organizacion?.id && prestacion.ejecucion.organizacion?.nombre === '') {
            // Si la organización no tiene nombre, se busca en la base de datos para obtenerlo
            const organizacionDB = await Organizacion.findOne({ _id: prestacion.ejecucion.organizacion.id });
            if (organizacionDB) {
                prestacion.ejecucion.organizacion.nombre = organizacionDB.nombre;
            } else {
                logger.error('prestacion:receta:create', prestacion, `No se encontró la organización con id ${prestacion.ejecucion.organizacion.id}`);
            }
        }
        const organizacion = {
            id: prestacion.ejecucion.organizacion.id,
            nombre: prestacion.ejecucion.organizacion.nombre
        };

        const pacienteCUIL = prestacion.paciente.cuil || generarCUIL(prestacion.paciente.documento, prestacion.paciente.sexo);

        const dataRecetaBase = {
            idPrestacion: prestacion.id,
            idRegistro,
            fechaRegistro: prestacion.ejecucion.fecha || moment().toDate(),
            fechaPrestacion: prestacion.ejecucion.fecha,
            paciente: prestacion.paciente,
            profesional,
            organizacion,
            medicamento: null,
            diagnostico: null,
        };
        dataRecetaBase.paciente.cuil = pacienteCUIL;

        for (const medicamento of registro.valor.medicamentos) {
            try {
                const conceptId = medicamento?.concepto?.conceptId || medicamento?.generico?.conceptId;

                if (!conceptId) {
                    logger.error('prestacion:receta:create', { idRegistro, medicamento }, 'No se pudo identificar conceptId del medicamento');
                    continue;
                }

                const recetasExistentes = await Receta.find({
                    'medicamento.concepto.conceptId': conceptId,
                    idRegistro
                });

                if (recetasExistentes && recetasExistentes.length > 0) {
                    for (const r of recetasExistentes) {
                        await RecetaControl.updateOne(
                            {
                                idPrestacion: prestacion.id,
                                idRegistro,
                                conceptId,
                                ordenTratamiento: (r as any).medicamento.ordenTratamiento
                            },
                            {
                                $set: {
                                    creada: true,
                                    idReceta: (r as any).idReceta
                                }
                            }
                        );
                    }
                } else {
                    const dataReceta = {
                        ...dataRecetaBase,
                        medicamento,
                        diagnostico: medicamento?.diagnostico || null,
                    };

                    const recetasCreadas = await crearReceta(dataReceta, prestacion.createdBy);
                    if (Array.isArray(recetasCreadas)) {
                        for (const r of recetasCreadas) {
                            const rDb = await Receta.findById(r._id);
                            if (rDb) {
                                await RecetaControl.updateOne(
                                    {
                                        idPrestacion: prestacion.id,
                                        idRegistro,
                                        conceptId,
                                        ordenTratamiento: (rDb as any).medicamento.ordenTratamiento
                                    },
                                    {
                                        $set: {
                                            creada: true,
                                            idReceta: (rDb as any).idReceta
                                        }
                                    }
                                );
                            }
                        }
                    }
                }
            } catch (errorMedicamento) {
                logger.error('prestacion:receta:create', { idRegistro, medicamento }, errorMedicamento);
            }

        }
    } catch (err) {
        logger.error('prestacion:receta:create', prestacion, err);
    }
});
