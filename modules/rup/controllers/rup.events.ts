import { EventCore } from '@andes/event-bus';
import { getProfesionActualizada, crearReceta } from '../../recetas/recetasController';
import * as moment from 'moment';
import { Receta } from '../../recetas/receta-schema';
import { rupEventsLog as logger } from './rup.events.log';
import { generarCUIL } from '../../../core-v2/mpi/validacion/validacion.controller';

EventCore.on('prestacion:receta:create', async ({ prestacion, registro }) => {
    try {
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

        const pacienteCUIL = prestacion.paciente.cuil || generarCUIL(prestacion.paciente.documento, prestacion.paciente.sexo);

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

        dataReceta.paciente.cuil = pacienteCUIL;

        for (const medicamento of registro.valor.medicamentos) {
            const receta: any = await Receta.findOne({
                'medicamento.concepto.conceptId': medicamento.generico.conceptId,
                idRegistro
            });
            if (!receta) {
                dataReceta.medicamento = medicamento;
                dataReceta.diagnostico = medicamento.diagnostico;
                await crearReceta(dataReceta, prestacion.createdBy); // falta return
            }

        }
    } catch (err) {
        logger.error('prestacion:receta:create', prestacion, err);
    }
});
