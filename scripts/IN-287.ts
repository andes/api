import * as moment from 'moment';
import { Types } from 'mongoose';
import { CamaEstados } from '../modules/rup/internacion/cama-estados.schema';
import { InternacionResumen } from '../modules/rup/internacion/resumen/internacion-resumen.schema';
import { Prestacion } from '../modules/rup/schemas/prestacion';

async function run(done) {
    const desde = moment().subtract(6, 'month').startOf('month').toDate();

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

        await CamaEstados.update(
            {
                idOrganizacion: Types.ObjectId(prestacion.solicitud.organizacion.id),
                ambito: 'internacion',
                capa: 'estadistica',
                'estados.idInternacion': Types.ObjectId(prestacion.id)
            },
            {
                $set: { 'estados.$[elemento].fechaIngreso': prestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso }
            },
            {
                arrayFilters: [{ 'elemento.idInternacion': Types.ObjectId(prestacion.id) }],
                multi: true
            }
        );


    }


    const internaciones = InternacionResumen.find({
        fechaIngreso: { $gte: desde },
        deletedAt: null
    }).cursor({ batchSize: 100 });

    for await (const internacion of internaciones) {
        i++;
        // eslint-disable-next-line no-console
        if (i % 10 === 0) { console.log(i); }

        await CamaEstados.update(
            {
                'estados.idInternacion': Types.ObjectId(internacion.id)
            },
            {
                $set: { 'estados.$[elemento].fechaIngreso': internacion.fechaIngreso }
            },
            {
                arrayFilters: [{ 'elemento.idInternacion': Types.ObjectId(internacion.id) }],
                multi: true
            }
        );


    }


    done();
}

export = run;
