import { EventCore } from '@andes/event-bus';
import { crearRecetaInsumo } from '../../recetas/recetasInsumos/recetaInsumosController';
import { getProfesionActualizada } from '../../recetas/recetasController';
import * as moment from 'moment';
import { RecetaInsumo } from './receta-insumo.schema';
import { RecetaControl } from '../../recetas/receta-control-schema';
import { createLog } from './../recetaLogs';
import { Profesional } from '../../../core/tm/schemas/profesional';

EventCore.on('prestacion:recetaInsumo:create', async ({ prestacion, registro }) => {
    let dataReceta: any = {};
    let profesional = {};
    try {
        const idRegistro = registro._id;
        const documentoProfesional = prestacion.estadoActual.createdBy?.documento ? prestacion.estadoActual.createdBy?.documento : prestacion.solicitud.profesional.documento;
        const profPrestacion = await Profesional.findOne({ documento: documentoProfesional });
        if (!profPrestacion) {
            createLog.error('create', { dataReceta, prestacion, profesional: null }, null, { prestacion, registro });
            return;
        }
        const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profPrestacion.id);
        profesional = {
            id: profPrestacion.id,
            nombre: profPrestacion.nombre,
            apellido: profPrestacion.apellido,
            documento: profPrestacion.documento,
            profesion: profesionGrado,
            especialidad: especialidades,
            matricula: matriculaGrado
        };
        const organizacion = {
            id: prestacion.ejecucion.organizacion.id,
            nombre: prestacion.ejecucion.organizacion.nombre
        };
        dataReceta = {
            idPrestacion: prestacion.id,
            idRegistro,
            fechaRegistro: prestacion.ejecucion.fecha || moment().toDate(),
            fechaPrestacion: prestacion.ejecucion.fecha,
            paciente: prestacion.paciente,
            profesional,
            organizacion,
            insumo: null,
            diagnostico: null,
        };

        for (const insumo of registro.valor.insumos) {
            const insumoId = insumo.generico?.id || insumo.id;
            if (!insumoId) {
                continue;
            }

            const recetasExistentes = await RecetaInsumo.find({
                'insumo.id': insumo.generico.id,
                'insumo.nombre': insumo.generico.nombre,
                idRegistro
            });

            if (recetasExistentes && recetasExistentes.length > 0) {
                for (const r of recetasExistentes) {
                    await RecetaControl.updateOne(
                        {
                            idPrestacion: prestacion.id,
                            idRegistro,
                            insumoId,
                            ordenTratamiento: (r as any).insumo.ordenTratamiento
                        },
                        {
                            $set: {
                                creada: true,
                                idReceta: r._id.toString()
                            }
                        }
                    );
                }
            } else {
                dataReceta.insumo = insumo;
                const recetasCreadas = await crearRecetaInsumo(dataReceta, prestacion.createdBy);
                if (Array.isArray(recetasCreadas)) {
                    for (const r of recetasCreadas) {
                        const rDb = await RecetaInsumo.findById(r._id);
                        if (rDb) {
                            await RecetaControl.updateOne(
                                {
                                    idPrestacion: prestacion.id,
                                    idRegistro,
                                    insumoId,
                                    ordenTratamiento: (rDb as any).insumo.ordenTratamiento
                                },
                                {
                                    $set: {
                                        creada: true,
                                        idReceta: rDb._id.toString()
                                    }
                                }
                            );
                        }
                    }
                }
            }

        }
    } catch (err) {
        createLog.error('create', { dataReceta, prestacion, profesional }, err, { prestacion, registro });
        return err;
    }
});

