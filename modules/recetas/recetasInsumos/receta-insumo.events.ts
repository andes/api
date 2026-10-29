import { EventCore } from '@andes/event-bus';
import { crearRecetaInsumo } from '../../recetas/recetasInsumos/recetaInsumosController';
import { getProfesionActualizada } from '../../recetas/recetasController';
import * as moment from 'moment';
import { RecetaInsumo } from './receta-insumo.schema';
import { RecetaControl } from '../../recetas/receta-control-schema';
import { resolverIdentificador } from '../../recetas/recetas.helpers';
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
            await crearRecetaInsumo(dataReceta, prestacion.createdBy);

            const queryInsumosDb: any = {
                idPrestacion: prestacion.id,
                idRegistro
            };
            if (insumoId) {
                queryInsumosDb['insumo.id'] = insumoId;
            }
            const recetasEnDb = await RecetaInsumo.find(queryInsumosDb);

            const tipoInsumo = insumo.esMagistral ? 'magistral' : (insumo.generico?.tipo || insumo.tipo || 'dispositivo');
            const tratamientoProlongado = !!(insumo.tratamientoProlongado && insumo.tiempoTratamiento && insumo.tiempoTratamiento.id !== null);
            const cantRecetas = tratamientoProlongado ? parseInt(insumo.tiempoTratamiento.id, 10) : 1;
            const identificador = resolverIdentificador(insumo, tipoInsumo);
            const nombreInsumo = identificador?.nombre;

            const queryControl: any = {
                idPrestacion: prestacion.id || prestacion._id,
                idRegistro: idRegistro || registro._id,
                tipo: tipoInsumo
            };
            const orConditions: any[] = [];
            if (identificador?.conceptId) {
                orConditions.push({ 'identificador.conceptId': identificador.conceptId });
            }
            if (identificador?.codigo?.length) {
                orConditions.push({ 'identificador.codigo.valor': { $in: identificador.codigo.map((c: any) => c.valor) } });
            }
            if (nombreInsumo) {
                orConditions.push({ nombre: nombreInsumo });
                orConditions.push({ 'identificador.nombre': nombreInsumo });
            }
            if (orConditions.length > 0) {
                queryControl.$or = orConditions;
            }

            let control: any = await RecetaControl.findOne(queryControl);

            if (!control) {
                control = new RecetaControl({
                    idPrestacion: prestacion.id || prestacion._id,
                    idRegistro: idRegistro || registro._id,
                    idPaciente: prestacion.paciente.id || prestacion.paciente._id,
                    tipo: tipoInsumo,
                    nombre: nombreInsumo,
                    identificador,
                    tratamientoProlongado,
                    cantTotalRecetas: cantRecetas,
                    intento: 0,
                    estado: 'pendiente',
                    recetas: []
                });
            }

            if (!Array.isArray(control.recetas)) {
                control.recetas = [];
            }

            for (const r of recetasEnDb) {
                const orden = r.insumo?.ordenTratamiento ?? 0;
                const indexExistente = control.recetas.findIndex((item: any) => {
                    const id = item.receta_id || item.idReceta;
                    return (id && (String(id) === String(r._id) || String(id) === String(r.idReceta))) || item.ordenTratamiento === orden;
                });
                const esRecetar = Boolean(r.origenExterno?.id || r.origenExterno?.app === 'recetar');
                const origenReceta = esRecetar ? 'recetar' : 'andes';
                const itemReceta = {
                    receta_id: r._id || r.id,
                    ordenTratamiento: orden,
                    origen: (indexExistente >= 0 && control.recetas[indexExistente].origen === 'recetar') ? 'recetar' : origenReceta,
                    fecha: r.createdAt || new Date()
                };
                if (indexExistente >= 0) {
                    control.recetas[indexExistente] = { ...control.recetas[indexExistente], ...itemReceta };
                } else {
                    control.recetas.push(itemReceta);
                }
            }

            if (control.estado !== 'suspendido') {
                if (control.recetas.length >= control.cantTotalRecetas) {
                    control.estado = 'completo';
                } else {
                    control.estado = 'incompleto';
                }
            }

            if (prestacion.createdBy) {
                if (typeof (control as any).audit === 'function') {
                    (control as any).audit(prestacion.createdBy);
                } else {
                    Auth.audit(control, { user: prestacion.createdBy } as any);
                }
            }
            await control.save();
        }
    } catch (err) {
        createLog.error('create', { dataReceta, prestacion, profesional }, err, { prestacion, registro });
        return err;
    }
});

