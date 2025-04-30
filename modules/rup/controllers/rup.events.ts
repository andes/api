import { EventCore } from '@andes/event-bus';
import { getProfesionActualizada } from '../../recetas/recetasController';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { userScheduler } from '../../../config.private';
import { Receta } from '../../recetas/receta-schema';
import { rupEventsLog as logger } from './rup.events.log';
import { ECLQueries } from '../../../core/tm/schemas/eclqueries.schema';

EventCore.on('prestacion:receta:create', async (prestacion) => {
    try {
        if (prestacion.prestacion) {
            prestacion = prestacion.prestacion;
        }
        const idPrestacion = prestacion.id;
        const registros = prestacion.ejecucion.registros;
        const profPrestacion = prestacion.solicitud.profesional;

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

        const organizacion = {
            id: prestacion.ejecucion.organizacion.id,
            nombre: prestacion.ejecucion.organizacion.nombre
        };
        const conceptIds = [];
        const query: any = await ECLQueries.find({ key: /prescripcion/ig });
        for (const item of query) {
            conceptIds.push(item.valor);
        }
        for (const registro of registros) {
            if (conceptIds.includes(registro.concepto.conceptId)) {
                for (const medicamento of registro.valor.medicamentos) {
                    let receta: any = await Receta.findOne({ idPrestacion: 0 });
                    if (!receta) {
                        receta = new Receta();
                    }
                    receta.organizacion = organizacion;
                    receta.profesional = profesional;
                    receta.fechaRegistro = moment(prestacion.ejecucion.fecha).toDate();
                    receta.fechaPrestacion = moment(prestacion.ejecucion.fecha).toDate();
                    receta.idPrestacion = idPrestacion;
                    receta.idRegistro = registro._id;
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
    } catch (err) {
        logger.error('prestacion:receta:create', prestacion, err);
    }
});

EventCore.on('prestacion:receta:delete', async (prestacion) => {
    if (prestacion.prestacion) {
        prestacion = prestacion.prestacion;
    }
    try {
        const idPrestacion = prestacion.id;
        const recetas = await Receta.find({ idPrestacion });
        for (const receta of recetas) {
            await Receta.findOneAndDelete({ _id: mongoose.Types.ObjectId(receta._id) });
        }
    } catch (err) {
        logger.error('prestacion:receta:delete', prestacion, err);
    }
});
