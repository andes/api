import { CamaEstados } from '../modules/rup/internacion/cama-estados.schema';
import moment = require('moment');

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
        'estados.extras.egreso': true,
        deletedAt: { $exists: false }
    }).cursor({ batchSize: 100 });

    for await (const registro of registrosPrevios) {
        const estados = registro.estados;
        const estadoSinDuplicar: typeof registro.estados = [];

        for (const estado of estados) {
            const fecha = moment(estado.fecha).format('YYYY-MM-DD');
            const idInternacion = estado.extras?.idInternacion;
            const createdAt = estado.createdAt;

            if (fecha && idInternacion) {
                const existeEstadoIndex = estadoSinDuplicar.findIndex(e => {
                    const fechaConvertida = moment(e.fecha);
                    return (
                        fechaConvertida.isSame(fecha, 'day') &&
                        e.extras?.idInternacion?.toString() === idInternacion.toString() &&
                        e.createdAt <= createdAt
                    );
                });

                if (existeEstadoIndex >= 0) {
                    estadoSinDuplicar.splice(existeEstadoIndex, 1);
                }
            }
            estadoSinDuplicar.push(estado);
        }
        const estadosUnicos = Array.from(estadoSinDuplicar.values());

        // Actualizar la colección CamaEstados
        await CamaEstados.updateOne(
            { _id: registro._id },
            { $set: { estados: estadosUnicos } }
        );
    }
    done();
}

export = egresosDuplicados;
