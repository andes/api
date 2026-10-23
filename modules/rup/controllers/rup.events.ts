import { EventCore } from '@andes/event-bus';
import { getProfesionActualizada, crearReceta } from '../../recetas/recetasController';
import * as moment from 'moment';
import { Receta } from '../../recetas/receta-schema';
import { RecetaControl } from '../../recetas/receta-control-schema';
import { resolverIdentificador } from '../../recetas/recetas.helpers';
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

                const respCrear: any = await crearReceta(dataReceta, prestacion.createdBy);
                if (respCrear instanceof Error || (respCrear && !Array.isArray(respCrear) && (respCrear.message || respCrear.errors || respCrear.status))) {
                    throw (respCrear instanceof Error ? respCrear : new Error(respCrear.message || JSON.stringify(respCrear)));
                }

                // Buscamos todas las recetas creadas / existentes para este registro
                const queryRecetasDb: any = {
                    idPrestacion: prestacion.id || prestacion._id,
                    idRegistro: idRegistro || registro._id
                };
                if (esMagistral) {
                    queryRecetasDb['medicamento.magistral.nombre'] = medicamento.magistral?.nombre;
                } else {
                    queryRecetasDb['medicamento.concepto.conceptId'] = conceptId;
                }
                const recetasEnDb = await Receta.find(queryRecetasDb);

                const tratamientoProlongado = !!(medicamento.tratamientoProlongado && medicamento.tiempoTratamiento && medicamento.tiempoTratamiento.id !== null);
                const cantRecetas = tratamientoProlongado ? parseInt(medicamento.tiempoTratamiento.id, 10) : 1;
                const tipo = esMagistral ? 'magistral' : 'medicamento';
                const identificador = resolverIdentificador(medicamento, tipo);
                const nombre = identificador?.nombre;

                const queryControl: any = {
                    idPrestacion: prestacion.id || prestacion._id,
                    idRegistro: idRegistro || registro._id,
                    tipo
                };
                const orConditions: any[] = [];
                if (identificador?.conceptId) {
                    orConditions.push({ 'identificador.conceptId': identificador.conceptId });
                }
                if (identificador?.codigo?.length) {
                    orConditions.push({ 'identificador.codigo.valor': { $in: identificador.codigo.map((c: any) => c.valor) } });
                }
                if (nombre) {
                    orConditions.push({ nombre });
                    orConditions.push({ 'identificador.nombre': nombre });
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
                        tipo,
                        nombre,
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
                    const orden = r.medicamento?.ordenTratamiento ?? 0;
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
            } catch (errorMedicamento: any) {
                logger.error('prestacion:receta:create', { idRegistro, medicamento }, errorMedicamento);
                try {
                    const tipo = medicamento?.esMagistral ? 'magistral' : 'medicamento';
                    const identificador = resolverIdentificador(medicamento, tipo);
                    const queryControl: any = {
                        idPrestacion: prestacion.id || prestacion._id,
                        idRegistro: idRegistro || registro._id,
                        tipo
                    };
                    const orConditions: any[] = [];
                    if (identificador?.conceptId) {
                        orConditions.push({ 'identificador.conceptId': identificador.conceptId });
                    }
                    if (identificador?.codigo?.length) {
                        orConditions.push({ 'identificador.codigo.valor': { $in: identificador.codigo.map((c: any) => c.valor) } });
                    }
                    if (identificador?.nombre) {
                        orConditions.push({ nombre: identificador.nombre });
                        orConditions.push({ 'identificador.nombre': identificador.nombre });
                    }
                    if (orConditions.length > 0) {
                        queryControl.$or = orConditions;
                    }
                    let controlErr: any = await RecetaControl.findOne(queryControl);
                    if (!controlErr) {
                        controlErr = new RecetaControl({
                            idPrestacion: prestacion.id || prestacion._id,
                            idRegistro: idRegistro || registro._id,
                            idPaciente: prestacion.paciente.id || prestacion.paciente._id,
                            tipo,
                            nombre: identificador?.nombre,
                            identificador,
                            tratamientoProlongado: !!(medicamento.tratamientoProlongado && medicamento.tiempoTratamiento?.id),
                            cantTotalRecetas: (medicamento.tratamientoProlongado && medicamento.tiempoTratamiento?.id) ? parseInt(medicamento.tiempoTratamiento.id, 10) : 1,
                            intento: 0,
                            estado: 'incompleto',
                            recetas: []
                        });
                    }
                    controlErr.ultimoError = {
                        message: errorMedicamento?.message || String(errorMedicamento),
                        status: errorMedicamento?.status,
                        name: errorMedicamento?.name,
                        fecha: new Date()
                    };
                    controlErr.markModified('ultimoError');
                    if (prestacion.createdBy) {
                        if (typeof (controlErr as any).audit === 'function') {
                            (controlErr as any).audit(prestacion.createdBy);
                        } else {
                            Auth.audit(controlErr, { user: prestacion.createdBy } as any);
                        }
                    }
                    await controlErr.save();
                } catch (saveErr) {
                    logger.error('prestacion:receta:create:saveError', { idRegistro }, saveErr);
                }
            }

        }
    } catch (err) {
        logger.error('prestacion:receta:create', prestacion, err);
    }
});
