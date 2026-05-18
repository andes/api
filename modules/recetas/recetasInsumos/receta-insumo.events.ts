import { EventCore } from '@andes/event-bus';
import { crearRecetaInsumo } from '../../recetas/recetasInsumos/recetaInsumosController';
import { getProfesionActualizada } from '../../recetas/recetasController';
import * as moment from 'moment';
import { RecetaInsumo } from './receta-insumo.schema';
import { createLog, informarLog, updateLog, jobsLog } from './../recetaLogs';

EventCore.on('prestacion:recetaInsumo:create', async ({ prestacion, registro }) => {
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

    const dataReceta = {
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
    try {
        for (const insumo of registro.valor.insumos) {
            const receta: any = await RecetaInsumo.findOne({
                'insumo.nombre': insumo.generico.nombre,
                idRegistro
            });
            if (!receta) {
                dataReceta.insumo = insumo;
                await crearRecetaInsumo(dataReceta, prestacion.createdBy); // falta return
            }

        }
    } catch (err) {
        createLog.error('create', { dataReceta, prestacion, profesional }, err, { prestacion, registro });
        return err;
    }
});
