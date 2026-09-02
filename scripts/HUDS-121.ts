import { Prestacion } from '../modules/rup/schemas/prestacion';
import moment = require('moment');
async function run(done) {
    const paramInicio = process.argv[3];
    const paramFin = process.argv[4];
    const start = paramInicio ?
        moment(new Date(paramInicio).setHours(0, 0, 0, 0)).format('YYYY-MM-DD HH:mm:ss') :
        moment(new Date().setHours(0, 0, 0, 0)).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
    const end = paramFin ?
        moment(new Date(paramFin).setHours(23, 59, 0, 0)).format('YYYY-MM-DD HH:mm:ss') :
        moment(new Date().setHours(23, 59, 0, 0)).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
    const prestacionesConNotaPublica: any = await Prestacion.aggregate([
        {
            $match: {
                'ejecucion.fecha': {
                    $gte: new Date(start),
                    $lte: new Date(end)
                },
                'estadoActual.tipo': 'validada',
                'ejecucion.registros.concepto.conceptId': '4291000013101'
            }
        },
        {
            $unwind: '$ejecucion.registros'
        },
        {
            $match: {
                'ejecucion.registros.concepto.conceptId': '4291000013101',
                'ejecucion.registros.privacy.scope': 'public'
            }
        }
    ]);

    const updatePrestaciones = prestacionesConNotaPublica.map(prestacion =>
        Prestacion.updateOne(
            { _id: prestacion._id },
            {
                $set: { 'ejecucion.registros.$[elem].privacy.scope': 'private' }
            },
            {
                arrayFilters: [{ 'elem.concepto.conceptId': '4291000013101', 'elem.privacy.scope': 'public' }]
            }
        )
    );
    try {
        await Promise.all(updatePrestaciones);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err.message);
        return;
    }
    done();
}
export = run;
