import { EventCore } from '@andes/event-bus';
import { crearRecetaInsumo } from '../../recetas/recetasInsumos/recetaInsumosController';
import { getProfesionActualizada } from '../../recetas/recetasController';
import * as moment from 'moment';
import { RecetaInsumo } from './receta-insumo.schema';
import { RecetaControl } from '../../recetas/receta-control-schema';
import { createLog } from './../recetaLogs';

EventCore.on('prestacion:recetaInsumo:create', async ({ prestacion, registro }) => {
    const idRegistro = registro._id;
    const profPrestacion = prestacion.solicitud.profesional;
    const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profPrestacion.id);
    const profesional = {
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

    const dataReceta = {
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
    try {
        // Cargar las recetas de insumos/magistrales pendientes en la colección auxiliar
        for (const insumo of registro.valor.insumos) {
            try {
                const insumoId = insumo.generico?.id || insumo.id;
                if (!insumoId) {
                    continue;
                }

                const tipoInsumo = insumo.generico?.tipo || insumo.tipo;
                const tipoPrescripcion = (tipoInsumo === 'magistral') ? 'magistrales' : 'insumos';

                const cantRecetas = (insumo.tratamientoProlongado && insumo.tiempoTratamiento && insumo.tiempoTratamiento.id) ? parseInt(insumo.tiempoTratamiento.id, 10) : 1;
                for (let i = 0; i < cantRecetas; i++) {
                    const controlExistente = await RecetaControl.findOne({
                        idPrestacion: prestacion.id,
                        idRegistro,
                        insumoId,
                        ordenTratamiento: i
                    });

                    if (!controlExistente) {
                        const nuevoControl = new RecetaControl({
                            idPrestacion: prestacion.id,
                            idRegistro,
                            idPaciente: prestacion.paciente.id || prestacion.paciente._id,
                            tipoPrescripcion,
                            creada: false,
                            insumoId,
                            ordenTratamiento: i
                        });

                        if (prestacion.createdBy) {
                            (nuevoControl as any).audit(prestacion.createdBy);
                        }
                        await nuevoControl.save();
                    }
                }
            } catch (errControl) {
                createLog.error('create:control', { dataReceta, prestacion, profesional }, errControl, { prestacion, registro });
            }
        }

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

