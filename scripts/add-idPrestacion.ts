import { InternacionResumen } from '../modules/rup/internacion/resumen/internacion-resumen.schema';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import moment = require('moment');

async function run(done, fechaDesde, fechaHasta) {
    const cursor = InternacionResumen.find({
        fechaIngreso: { $gte: fechaDesde, $lte: fechaHasta }
    }).cursor({ batchSize: 100 });

    const sincronizarResumen = async (resumen) => {
        try {
            if (!resumen.idPrestacion) {
                const horaDesde = moment(resumen.fechaIngreso).subtract(12, 'hours');
                const horaHasta = moment(resumen.fechaIngreso).add(12, 'hours');
                const prestacion: any = await Prestacion.find({
                    'ejecucion.registros.valor.informeIngreso.fechaIngreso': { $gte: horaDesde, $lte: horaHasta },
                    'paciente.id': resumen.paciente.id
                });
                if (prestacion?._id) {
                    resumen.idPrestacion = prestacion._id;
                    await InternacionResumen.findOneAndUpdate({ _id: resumen._id }, resumen);
                }
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err.message);
            return;
        }
    };
    await cursor.eachAsync(async (resumen) => await sincronizarResumen(resumen));
    done();
}

export = run;
