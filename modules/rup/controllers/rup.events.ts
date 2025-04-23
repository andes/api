import { EventCore } from '@andes/event-bus';
import { getProfesionActualizada } from '../../recetas/recetaController';
import * as moment from 'moment';
import { userScheduler } from '../../../config.private';
import { Receta } from '../../recetas/receta.schema';
import { rupEventsLog as logger } from './rup.events.log';
import { RecetaDispositivo } from '../../recetas/receta-dispositivo.schema';

const conceptIdsMedicamento = ['33633005', '103742009']; // Receta y renovación de receta de MEDICAMENTOS
const conceptIdsDispositivo = ['313047003']; // Receta de DISPOSITIVOS (INSUMOS)

EventCore.on('prestacion:receta:create', async (prestacion) => {
    try {
        if (prestacion.prestacion) {
            prestacion = prestacion.prestacion;
        }
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

        for (const registro of registros) {
            if (conceptIdsMedicamento.includes(registro.concepto.conceptId)) {
                const medicamentos = registro.valor.medicamentos;
                await saveRecetaMedicamentos(organizacion, profesional, prestacion, registro, medicamentos);
            } else if (conceptIdsDispositivo.includes(registro.concepto.conceptId)) {
                const dispositivos = registro.valor.dispositivos;
                await saveRecetaDispositivos(organizacion, profesional, prestacion, registro, dispositivos);
            }
        }
    } catch (err) {
        logger.error('prestacion:receta:create', prestacion, err);
    }
});

/**
 * Por cada medicamento genera un nuevo documento en la coleccion 'receta'
 */
async function saveRecetaMedicamentos(organizacion, profesional, prestacion, registro, medicamentos) {
    for (const medicamento of medicamentos) {
        let receta: any = await Receta.findOne({ idPrestacion: 0 });
        if (!receta) {
            receta = new Receta();
        }
        receta.organizacion = organizacion;
        receta.profesional = profesional;
        receta.fechaRegistro = moment(prestacion.ejecucion.fecha).toDate();
        receta.fechaPrestacion = moment(prestacion.ejecucion.fecha).toDate();
        receta.idPrestacion = prestacion.id;
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
            tipoReceta: medicamento.tipoReceta || 'simple',
            serie: medicamento.serie,
            numero: medicamento.numero
        };
        receta.estados = [{ tipo: 'vigente' }];
        receta.estadoActual = { tipo: 'vigente' };
        receta.estadosDispensa = [{ tipo: 'sin-dispensa', fecha: moment().toDate() }];
        receta.estadoDispensaActual = { tipo: 'sin-dispensa', fecha: moment().toDate() };
        receta.paciente = prestacion.paciente;
        receta.audit(prestacion.createdBy);
        await receta.save();
    }
}

/**
 * Por cada dispositivo recetado genera un nuevo documento en la coleccion 'prescripcionInsumos'
 */
async function saveRecetaDispositivos(organizacion, profesional, prestacion, registro, dispositivos) {
    for (const dispositivo of dispositivos) {
        let recetaDispositivo: any = await RecetaDispositivo.findOne({ idPrestacion: 0 });
        if (!recetaDispositivo) {
            recetaDispositivo = new RecetaDispositivo();
        }
        recetaDispositivo.organizacion = organizacion;
        recetaDispositivo.profesional = profesional;
        recetaDispositivo.fechaRegistro = moment(prestacion.ejecucion.fecha).toDate();
        recetaDispositivo.fechaPrestacion = moment(prestacion.ejecucion.fecha).toDate();
        recetaDispositivo.idPrestacion = prestacion.id;
        recetaDispositivo.idRegistro = registro._id;
        recetaDispositivo.dispositivo = {
            concepto: dispositivo.generico,
            cantidad: dispositivo.cantidad,
            tratamientoProlongado: dispositivo.tratamientoProlongado,
            tiempoTratamiento: dispositivo.tiempoTratamiento,
        };
        recetaDispositivo.estados = [{ tipo: 'vigente' }];
        recetaDispositivo.estadoActual = { tipo: 'vigente' };
        recetaDispositivo.estadosDispensa = [{ tipo: 'sin-dispensa', fecha: moment().toDate() }];
        recetaDispositivo.estadoDispensaActual = { tipo: 'sin-dispensa', fecha: moment().toDate() };
        recetaDispositivo.paciente = prestacion.paciente;
        recetaDispositivo.audit(userScheduler);
        await recetaDispositivo.save();
    }
}
