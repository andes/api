import { CamaEstados } from '../modules/rup/internacion/cama-estados.schema';
import moment = require('moment');
import { Prestacion } from '../modules/rup/schemas/prestacion';

async function egresosDuplicados(done: () => void) {
    const paramInicio = process.argv[3];
    const paramFin = process.argv[4];

    // Validar parámetros
    if (!moment(paramInicio, 'YYYY-MM-DD', true).isValid() || !moment(paramFin, 'YYYY-MM-DD', true).isValid()) {
        return done();
    }

    // Inicializar las fechas con inicio y fin del día
    const start = moment(paramInicio).startOf('day').toDate();
    const end = moment(paramFin).endOf('day').toDate();

    const registrosPrevios = CamaEstados.find({
        ambito: 'internacion',
        capa: 'estadistica',
        start: { $gte: start },
        end: { $lte: end },
        'estados.extras.idInternacion': { $exists: true },
        'estados.extras.egreso': true
    }).cursor({ batchSize: 100 });

    for await (const registro of registrosPrevios) {
        const estados = registro.estados;
        const estadosModificados: typeof registro.estados = [];

        for (const estado of estados) {
            const esEgreso = estado.extras?.egreso;
            const idInternacion = estado.extras?.idInternacion;
            const tieneDeletedAt = estado.deletedAt;
            const fechaInternacion = moment(estado.createdAt).startOf('day');
            if (esEgreso && idInternacion && !tieneDeletedAt) {
                estadosModificados.forEach(async e => {
                    const fechaConvertida = moment(e.fecha);

                    if (fechaConvertida.isSame(fechaInternacion, 'day') &&
                        e.extras?.idInternacion?.toString() === idInternacion.toString()) {
                        const prestacionBuscada: any = await Prestacion.find({ _id: idInternacion });
                        const fechaPrestacion = moment(prestacionBuscada.updatedAt).startOf('day');

                        if (!fechaInternacion.isSame(fechaPrestacion, 'day')) {
                            estado.deletedAt = moment().toDate();
                            estado.deletedBy = 'script de eliminación de duplicados';
                        }
                        if (!fechaConvertida.isSame(fechaPrestacion, 'day')) {
                            e.deletedAt = moment().toDate();
                            e.deletedBy = 'script de eliminación de duplicados';
                        }
                    }
                });
            }
            estadosModificados.push(estado);
        }
        const estadosFiltrados = Array.from(estadosModificados.values());

        // Actualizar la colección CamaEstados
        await CamaEstados.updateOne(
            { _id: registro._id },
            { $set: { estados: estadosFiltrados } }
        );
    }
    done();
}

export = egresosDuplicados;
