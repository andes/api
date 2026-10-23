import { EventCore } from '@andes/event-bus';
import { getProfesionActualizada, crearReceta } from '../../recetas/recetasController';
import * as moment from 'moment';
import { Receta } from '../../recetas/receta-schema';
import { RecetaControl } from '../../recetas/receta-control-schema';
import { rupEventsLog as logger } from './rup.events.log';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { generarCUIL } from '../../../core-v2/mpi/validacion/validacion.controller';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
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

                if (!conceptId && !esMagistral) {
                    logger.error('prestacion:receta:create', { idRegistro, medicamento }, 'No se pudo identificar conceptId del medicamento');
                    continue;
                }
                if (esMagistral && !medicamento?.magistral?.nombre) {
                    logger.error('prestacion:receta:create', { idRegistro, medicamento }, 'No se pudo identificar nombre del medicamento magistral');
                    continue;
                }

                const dataReceta = {
                    ...dataRecetaBase,
                    medicamento,
                    diagnostico: medicamento?.diagnostico || null,
                };

                await crearReceta(dataReceta, prestacion.createdBy);

                // Buscamos todas las recetas creadas / existentes para este registro
                const queryRecetasDb: any = {
                    idPrestacion: prestacion.id,
                    idRegistro
                };
                if (esMagistral) {
                    queryRecetasDb['medicamento.magistral.nombre'] = medicamento.magistral?.nombre;
                } else {
                    queryRecetasDb['medicamento.concepto.conceptId'] = conceptId;
                }
                const recetasEnDb = await Receta.find(queryRecetasDb);

                const tratamientoProlongado = !!(medicamento.tratamientoProlongado && medicamento.tiempoTratamiento && medicamento.tiempoTratamiento.id !== null);
                const cantRecetas = tratamientoProlongado ? parseInt(medicamento.tiempoTratamiento.id, 10) : 1;
                const nombre = esMagistral ? medicamento.magistral?.nombre : (medicamento.concepto?.term || medicamento.generico?.term);

                let control: any = await RecetaControl.findOne({
                    prestacionId: prestacion.id,
                    registroId: idRegistro,
                    tipo: esMagistral ? 'magistral' : 'medicamento',
                    ...(esMagistral
                        ? { nombre }
                        : { $or: [{ 'codigo.conceptId': conceptId }, { codigo: conceptId }] }
                    )
                });

                if (!control) {
                    control = new RecetaControl({
                        prestacionId: prestacion.id,
                        registroId: idRegistro,
                        pacienteId: prestacion.paciente.id || prestacion.paciente._id,
                        tipo: esMagistral ? 'magistral' : 'medicamento',
                        codigo: esMagistral ? (medicamento.magistral?.codigo || medicamento.magistral?.nombre) : (medicamento.generico || medicamento.concepto),
                        nombre,
                        tratamientoProlongado,
                        total: cantRecetas,
                        intento: 0,
                        estado: 'pendiente',
                        recetas: []
                    });
                }

                if (!Array.isArray(control.recetas)) {
                    control.recetas = [];
                }

                for (const r of recetasEnDb) {
                    const orden = r.medicamento?.ordenTratamiento ?? 0;
                    const indexExistente = control.recetas.findIndex((item: any) =>
                        (item.recetaId && String(item.recetaId) === String(r._id)) || item.ordenTratamiento === orden
                    );
                    const itemReceta = {
                        idReceta: r.idReceta || r._id.toString(),
                        recetaId: r._id,
                        ordenTratamiento: orden,
                        origen: 'evento',
                        fecha: r.createdAt || new Date()
                    };
                    if (indexExistente >= 0) {
                        control.recetas[indexExistente] = { ...control.recetas[indexExistente], ...itemReceta };
                    } else {
                        control.recetas.push(itemReceta);
                    }
                }

                if (control.recetas.length >= control.total) {
                    control.estado = 'completo';
                } else {
                    control.estado = 'incompleto';
                }

                if (prestacion.createdBy) {
                    if (typeof (control as any).audit === 'function') {
                        (control as any).audit(prestacion.createdBy);
                    } else {
                        Auth.audit(control, { user: prestacion.createdBy } as any);
                    }
                }
                await control.save();
            } catch (errorMedicamento) {
                logger.error('prestacion:receta:create', { idRegistro, medicamento }, errorMedicamento);
            }

        }
    } catch (err) {
        logger.error('prestacion:receta:create', prestacion, err);
    }
});
