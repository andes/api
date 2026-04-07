import { EventCore } from '@andes/event-bus';
import { getProfesionActualizada, crearReceta } from '../../recetas/recetasController';
import * as moment from 'moment';
import { Receta } from '../../recetas/receta-schema';
import { rupEventsLog as logger } from './rup.events.log';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { generarCUIL } from '../../../core-v2/mpi/validacion/validacion.controller';

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
                const conceptId = medicamento?.concepto?.conceptId || medicamento?.generico?.conceptId;

                if (!conceptId) {
                    logger.error('prestacion:receta:create', { idRegistro, medicamento }, 'No se pudo identificar conceptId del medicamento');
                    continue;
                }

                const receta: any = await Receta.findOne({
                    'medicamento.concepto.conceptId': conceptId,
                    idRegistro
                });

                if (!receta) {
                    const dataReceta = {
                        ...dataRecetaBase,
                        medicamento,
                        diagnostico: medicamento?.diagnostico || null,
                    };

                    await crearReceta(dataReceta, prestacion.createdBy);
                }
            } catch (errorMedicamento) {
                logger.error('prestacion:receta:create', { idRegistro, medicamento }, errorMedicamento);
            }

        }
    } catch (err) {
        logger.error('prestacion:receta:create', prestacion, err);
    }
});
