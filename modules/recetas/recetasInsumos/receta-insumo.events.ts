import { EventCore } from '@andes/event-bus';
import { crearRecetaInsumo } from '../../recetas/recetasInsumos/recetaInsumosController';
import { getProfesionActualizada } from '../../recetas/recetasController';
import * as moment from 'moment';
import { RecetaInsumo } from './receta-insumo.schema';
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
            if (!insumoId) {
                continue;
            }

            dataReceta.insumo = insumo;
            const recetasEnDb = await crearRecetaInsumo(dataReceta, prestacion.createdBy);

            const tratamientoProlongado = !!(insumo.tratamientoProlongado && insumo.tiempoTratamiento && insumo.tiempoTratamiento.id !== null);
            const cantRecetas = tratamientoProlongado ? parseInt(insumo.tiempoTratamiento.id, 10) : 1;

            const { tipo, identificador, nombre } = getDatosPrescripcion(insumo);
            const queryControl: any = {
                idPrestacion: dataReceta.idPrestacion,
                idRegistro: dataReceta.idRegistro,
                identificador: { $in: identificador },
                estado: { $in: ['pendiente', 'incompleto'] },
                tipo
            };
            let control: any = await RecetaControl.findOne(queryControl);

            if (control) {
                if (control.recetas?.length) {
                    control.recetas = [];
                }
                for (const r of recetasEnDb as any[]) {
                    const orden = r.insumo?.ordenTratamiento ?? 0;
                    const recetaCreada = control.recetas.find((item: any) => item.id === r.id);
                    if (!recetaCreada) {
                        const itemReceta = {
                            id: r.id,
                            ordenTratamiento: orden,
                            fecha: r.createdAt || new Date()
                        };
                        control.recetas.push(itemReceta);
                    }
                }

                control.estado = (control.estado !== 'suspendido') && (control.recetas.length >= control.cantTotalRecetas) ? 'completo' : 'incompleto';

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

