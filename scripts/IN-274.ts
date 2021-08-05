import * as moment from 'moment';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import * as CamasEstadosController from '../modules/rup/internacion/cama-estados.controller';
import { Types } from 'mongoose';

const dict = {};

async function getMovimientos(internacion, organizacion) {
    const desde = moment().subtract(3, 'month').startOf('month').toDate();
    const hasta = new Date();
    const ambito = 'internacion';
    const capa = 'estadistica';

    let movimientos = [];
    if (dict[String(organizacion)]) {
        movimientos = [...dict[String(organizacion)]];
    } else {
        const movs = await CamasEstadosController.searchEstados({ desde, hasta, organizacion, capa, ambito }, {});
        dict[String(organizacion)] = [...movs];
        movimientos = [...movs];
    }

    return movimientos
        .filter(mov => String(mov.idInternacion || mov.extras?.idInternacion) === String(internacion))
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

async function run(done) {
    const desde = moment().subtract(3, 'month').startOf('month').toDate();

    const prestaciones = Prestacion.find({
        'solicitud.ambitoOrigen': 'internacion',
        'solicitud.tipoPrestacion.conceptId': '32485007',
        'ejecucion.registros.valor.informeIngreso.fechaIngreso': { $gte: desde },
        'estadoActual.tipo': { $in: ['ejecucion', 'validada'] }
    }).cursor({ batchSize: 100 });
    let i = 0;
    for await (const prestacion of prestaciones) {
        i++;
        // eslint-disable-next-line no-console
        if (i % 10 === 0) { console.log(i); }


        const organizacion = prestacion.solicitud.organizacion.id;
        const internacion = prestacion.id;
        const movimientos = await getMovimientos(internacion, organizacion);

        const last = movimientos[movimientos.length - 1];


        if (last) {
            await Prestacion.update(
                { _id: prestacion._id },
                {
                    $set: {
                        unidadOrganizativa: last.unidadOrganizativa
                    }
                }
            );
        }

    }
    done();
}

export = run;
