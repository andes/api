import { userScheduler } from '../../../config.private';
import { EventCore } from '@andes/event-bus';
import * as moment from 'moment';
import { Receta } from '../../recetas/receta-schema';
import * as mongoose from 'mongoose';
import { rupEventsLog as logger } from './rup.events.log';
import { elementosRUPAsSet } from '../../rup/controllers/elementos-rup.controller';

EventCore.on('prestacion:receta:create', async (prestacion) => {
    let conceptId;
    try {
        if (prestacion.prestacion) {
            prestacion = prestacion.prestacion;
        }
        const idPrestacion = prestacion.id;
        const registros = prestacion.ejecucion.registros;
        const profPrestacion = prestacion.solicitud.profesional;
        const profesional = {
            id: profPrestacion.id,
            nombre: profPrestacion.nombre,
            apellido: profPrestacion.apellido,
            documento: profPrestacion.documento,
            profesion: 'medico',
            especialidad: 'especialidad',
            matricula: 123
        };
        const organizacion = {
            id: prestacion.ejecucion.organizacion.id,
            nombre: prestacion.ejecucion.organizacion.nombre
        };

        // Buscamos dentro de la prestacion el registro de prescripción de medicamento para obtener su elemento RUP.
        // y de esta forma poder obtener el conceptId correspondiente.
        const index = prestacion.ejecucion.registros.findIndex(registro => registro.concepto.term === 'prescripción de medicamento');
        if (index !== -1) {
            const elementoRUP = prestacion.ejecucion.registros[index].elementoRUP;
            const elementosRUPSet = await elementosRUPAsSet();
            const elemento = elementosRUPSet.getByID(elementoRUP);
            conceptId = elemento.conceptos[0].conceptId;
        }

        for (const registro of registros) {
            if (registro.concepto.conceptId === conceptId) { // Si es prescripción de medicamento.
                for (const medicamento of registro.valor.medicamentos) {
                    let receta: any = await Receta.findOne({ idPrestacion: 0 });
                    if (!receta) {
                        receta = new Receta();
                    }
                    receta.organizacion = organizacion;
                    receta.profesional = profesional;
                    receta.fechaRegistro = moment().toDate();
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
                        tiempoTratamiento: medicamento.tiempoTratamiento
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
