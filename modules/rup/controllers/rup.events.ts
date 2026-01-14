import { EventCore } from '@andes/event-bus';
import { getProfesionActualizada, crearReceta } from '../../recetas/recetasController';
import * as moment from 'moment';
import { userScheduler } from '../../../config.private';
import { Receta } from '../../recetas/receta-schema';
import { rupEventsLog as logger } from './rup.events.log';
import { ECLQueries } from '../../../core/tm/schemas/eclqueries.schema';

EventCore.on('prestacion:receta:create', async (prestacion, registro) => {
    try {
        const idRegistro = registro._id;
        const profPrestacion = prestacion.solicitud.profesional;
        const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profPrestacion.id);
        const idPrestacion = prestacion.id;
        const registros = prestacion.ejecucion.registros;

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
            medicamento: null,
            diagnostico: null,
        };
        for (const medic of registro.valor.medicamentos) {
            const rec: any = await Receta.findOne({
                'medicamento.concepto.conceptId': medic.generico.conceptId,
                idRegistro
            });
            if (!rec) {
                dataReceta.medicamento = medic;
                dataReceta.diagnostico = medic.diagnostico;
                await crearReceta(dataReceta, prestacion.createdBy); // falta return
                const conceptIds = [];
                const query: any = await ECLQueries.find({ key: /prescripcion/ig });
                for (const item of query) {
                    conceptIds.push(item.valor);
                }
                for (const reg of registros) {
                    if (conceptIds.includes(reg.concepto.conceptId)) {
                        for (const medicamento of reg.valor.medicamentos) {
                            let receta: any = await Receta.findOne({ idPrestacion: 0 });
                            if (!receta) {
                                receta = new Receta();
                            }
                            receta.organizacion = organizacion;
                            receta.profesional = profesional;
                            receta.fechaRegistro = moment(prestacion.ejecucion.fecha).toDate();
                            receta.fechaPrestacion = moment(prestacion.ejecucion.fecha).toDate();
                            receta.idPrestacion = idPrestacion;
                            receta.idRegistro = reg._id;
                            receta.diagnostico = medicamento.diagnostico;
                            receta.medicamento = {
                                concepto: medicamento.generico,
                                presentacion: medicamento.presentacion.term,
                                unidades: medicamento.unidades,
                                cantidad: medicamento.cantidad,
                                cantEnvases: medicamento.cantEnvases,
                                dosisDiaria: {
                                    dosis: medicamento.dosisDiaria.dosis,
                                    intervalo: medicamento.dosisDiaria.intervalo,
                                    dias: medicamento.dosisDiaria.dias,
                                    notaMedica: medicamento.dosisDiaria.notaMedica
                                },
                                tratamientoProlongado: medicamento.tratamientoProlongado,
                                tiempoTratamiento: medicamento.tiempoTratamiento,
                                tipoReceta: medicamento.tipoReceta || 'simple'
                            };
                            receta.estados = [{ tipo: 'vigente' }];
                            receta.estadoActual = { tipo: 'vigente' };
                            receta.estadosDispensa = [{ tipo: 'sin-dispensa', fecha: moment().toDate() }];
                            receta.estadoDispensaActual = { tipo: 'sin-dispensa', fecha: moment().toDate() };
                            receta.paciente = prestacion.paciente;
                            receta.audit(userScheduler);
                            await receta.save();
                        }
                    }

                }
            }
        }
    } catch (err) {
        logger.error('prestacion:receta:create', prestacion, err);
    }
});
