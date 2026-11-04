import { EventCore } from '@andes/event-bus';
import { getProfesionActualizada, crearReceta } from '../../recetas/recetasController';
import * as moment from 'moment';
import { rupEventsLog as logger } from './rup.events.log';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { generarCUIL } from '../../../core-v2/mpi/validacion/validacion.controller';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { RecetaControl } from '../../recetas/receta-control-schema';
import { getDatosPrescripcion } from '../../recetas/recetas.helpers';
import { Auth } from '../../../auth/auth.class';

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
                const esMagistral = !!medicamento?.esMagistral;
                const conceptId = medicamento?.concepto?.conceptId || medicamento?.generico?.conceptId;
                const { tipo, identificador } = getDatosPrescripcion(medicamento);

                if (!conceptId && !esMagistral) {
                    logger.error('prestacion:receta:create', { idRegistro, medicamento }, 'No se pudo identificar conceptId del medicamento');
                    continue;
                }
                if (esMagistral && !medicamento?.magistral?.nombre && !identificador?.length) {
                    logger.error('prestacion:receta:create', { idRegistro, medicamento }, 'No se pudo identificar el medicamento magistral');
                    continue;
                }

                const dataReceta = {
                    ...dataRecetaBase,
                    medicamento,
                    diagnostico: medicamento?.diagnostico || null,
                };

                const recetasCreadas: any = await crearReceta(dataReceta, prestacion.createdBy);

                const queryControl: any = {
                    idPrestacion: prestacion.id || prestacion._id,
                    idRegistro: idRegistro || registro._id,
                    identificador: { $in: identificador },
                    tipo
                };

                const control: any = await RecetaControl.findOne(queryControl);
                if (control) {
                    if (!Array.isArray(control.recetas)) {
                        control.recetas = [];
                    }

                    if (Array.isArray(recetasCreadas)) {
                        for (const r of recetasCreadas) {
                            const orden = r.medicamento?.ordenTratamiento ?? 0;
                            const rId = r._id || r.id;
                            const recetaCreada = control.recetas.find((item: any) => String(item.id) === String(rId));

                            if (!recetaCreada) {
                                const itemReceta = {
                                    id: rId,
                                    ordenTratamiento: orden,
                                    fecha: r.createdAt || new Date()
                                };
                                control.recetas.push(itemReceta);
                            }
                        }
                    } else if (recetasCreadas) {
                        control.ultimoError = {
                            message: recetasCreadas?.message || (typeof recetasCreadas === 'string' ? recetasCreadas : JSON.stringify(recetasCreadas)),
                            fecha: new Date()
                        };
                        control.markModified('ultimoError');
                    }

                    if (control.estado !== 'suspendido') {
                        if (control.recetas.length >= control.cantTotalRecetas) {
                            control.estado = 'completo';
                            control.ultimoError = null;
                        } else {
                            control.estado = 'incompleto';
                            if (!control.ultimoError) {
                                control.ultimoError = {
                                    message: `No se generaron todas las recetas (${control.recetas.length}/${control.cantTotalRecetas})`,
                                    fecha: new Date()
                                };
                            }
                        }
                        control.markModified('ultimoError');
                    }
                    if (prestacion.createdBy) {
                        if (typeof (control as any).audit === 'function') {
                            (control as any).audit(prestacion.createdBy);
                        } else {
                            Auth.audit(control, { user: prestacion.createdBy } as any);
                        }
                    }
                    await control.save();
                } else {
                    logger.error('prestacion:receta:create', { dataReceta, prestacion, profesional }, 'no existe receta en coleccion recetaControl');
                }
            } catch (errorMedicamento) {
                logger.error('prestacion:receta:create', { idRegistro, medicamento }, errorMedicamento);
            }

        }
    } catch (err) {
        logger.error('prestacion:receta:create', prestacion, err);
    }
});
