import { EventCore } from '@andes/event-bus';
import { crearRecetaInsumo } from '../../recetas/recetasInsumos/recetaInsumosController';
import { getProfesionActualizada } from '../../recetas/recetasController';
import * as moment from 'moment';
import { RecetaControl } from '../../recetas/receta-control-schema';
import { getDatosPrescripcion } from '../../recetas/recetas.helpers';
import { createLog } from './../recetaLogs';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { Auth } from '../../../auth/auth.class';

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
        const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profPrestacion);
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
            const { tipo, identificador } = getDatosPrescripcion(insumo);
            if (!insumoId && !identificador?.length) {
                continue;
            }

            dataReceta.insumo = insumo;
            const recetasEnDb: any = await crearRecetaInsumo(dataReceta, prestacion.createdBy);

            const queryControl: any = {
                idPrestacion: dataReceta.idPrestacion,
                idRegistro: dataReceta.idRegistro,
                identificador: { $in: identificador },
                estado: { $in: ['pendiente', 'incompleto'] },
                tipo
            };
            const control: any = await RecetaControl.findOne(queryControl);

            if (control) {
                if (!Array.isArray(control.recetas)) {
                    control.recetas = [];
                }
                if (Array.isArray(recetasEnDb)) {
                    for (const r of recetasEnDb) {
                        const orden = r.insumo?.ordenTratamiento ?? 0;
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
                } else if (recetasEnDb) {
                    control.ultimoError = {
                        message: recetasEnDb?.message || (typeof recetasEnDb === 'string' ? recetasEnDb : JSON.stringify(recetasEnDb)),
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
                createLog.error('evento Insumo recetaControl', { dataReceta, prestacion, profesional }, 'no existe receta en coleccion recetaControl');

            }
        }
    } catch (err) {
        createLog.error('evento Insumo create', { dataReceta, prestacion, profesional }, err);
        return err;
    }
});

