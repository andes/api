import { CamaEstados } from '../modules/rup/internacion/cama-estados.schema';
import moment = require('moment');

async function egresosDuplicados(done) {
    const paramInicio = process.argv[3];
    const paramFin = process.argv[4];
    const start = moment(paramInicio, 'YYYY-MM-DD', true).isValid() ?
        moment(new Date(paramInicio).setHours(0, 0, 0, 0)).format('YYYY-MM-DD HH:mm:ss') :
        moment(new Date().setHours(0, 0, 0, 0)).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
    const end = moment(paramFin, 'YYYY-MM-DD', true).isValid()
        ? moment(paramFin).endOf('day').format('YYYY-MM-DD HH:mm:ss')
        : moment().subtract(1, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss');

    const registroPrevios = CamaEstados.find({
        $and: [{
            ambito: 'internacion',
            capa: 'estadistica',
            start: { $gte: start },
            end: { $lte: end },
            'estados.extras.idInternacion': { $exists: true },
            'estados.extras.egreso': true
        }]
    }).cursor({ batchSize: 100 });

    for await (const registro of registroPrevios) {
        const estados = registro.estados;
        const estadoSinDuplicar = [];
        for (const estado of estados) {
            const fecha = moment(estado.fecha).format('YYYY-MM-DD');
            const idInternacion = estado.extras?.idInternacion;
            const createdAt = estado.createdAt;

            if (fecha && idInternacion) {
                const existeEstadoIndex = estadoSinDuplicar.findIndex(e => {
                    const fechaConvertida = moment(e.fecha).format('YYYY-MM-DD');
                    return (fechaConvertida === fecha && e.extras?.idInternacion?.toString() === idInternacion.toString()
                        && e.createdAt <= createdAt);
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
            { $set: { estados: estadosUnicos } } // Reemplaza el array `estados` con `estadosUnicos`
        );
    }
    done();
}

export = egresosDuplicados;
