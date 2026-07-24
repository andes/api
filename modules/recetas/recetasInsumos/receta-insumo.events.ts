import { EventCore } from '@andes/event-bus';
import { crearRecetaInsumo } from '../../recetas/recetasInsumos/recetaInsumosController';
import { getProfesionActualizada } from '../../recetas/recetasController';
import * as moment from 'moment';
import { RecetaInsumo } from './receta-insumo.schema';
import { createLog } from './../recetaLogs';
import { Profesional } from '../../../core/tm/schemas/profesional';

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
        const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profPrestacion.id);
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
            const receta: any = await RecetaInsumo.findOne({
                'insumo.id': insumo.generico.id,
                'insumo.nombre': insumo.generico.nombre,
                idRegistro
            });
            if (!receta) {
                dataReceta.insumo = insumo;
                await crearRecetaInsumo(dataReceta, prestacion.createdBy);
            }

        }
    } catch (err) {
        createLog.error('create', { dataReceta, prestacion, profesional }, err, { prestacion, registro });
        return err;
    }
});
