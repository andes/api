import { Prestacion } from '../modules/rup/schemas/prestacion';
import { InformacionExportada } from '../core/log/schemas/logExportaInformacion';
import * as moment from 'moment';


async function run(done) {
    let desde;
    let hasta;
    let exportadas;
    if (process.argv.length === 5) {
        // Se setea fecha desde y hasta en caso que se envie por parametro
        desde = process.argv[3];
        hasta = process.argv[4];
        const start = moment(desde).toDate();
        const end = moment(hasta).toDate();
        exportadas = InformacionExportada.find({
            'resultado.resultado': 'OK',
            fecha: { $gte: start, $lte: end },
            sistema: 'Nomivac',
            key: 'vacuna'
        }).cursor({ batchSize: 100 });
    } else {
        exportadas = InformacionExportada.find({
            'resultado.resultado': 'OK',
            sistema: 'Nomivac',
            key: 'vacuna',
        }).cursor({ batchSize: 100 });
    }
    for await (const exportada of exportadas) {
        if (!exportada.idPrestacion) {
            const pipeline =
            {
                'paciente.id': exportada.idPaciente,
                'estadoActual.tipo': 'validada',
                'ejecucion.registros.concepto.conceptId': { $in: ['1821000246103', '840534001'] },
            };
            const prestacion = await Prestacion.find(pipeline);
            for (const prest of prestacion) {
                const prestacionAux: any = new Prestacion(prest);
                const registros = prestacionAux.getRegistros(true);
                const registroVacuna = registros.find(registro => registro.concepto.conceptId === '840534001');
                if (check(exportada, registroVacuna)) {
                    await InformacionExportada.update({ _id: exportada._id }, { $set: { idPrestacion: prestacionAux._id } });
                }
            }

        }
    }
    done();
}

// Función que chequea que el documento de "InformacionExportada" haya sido creada con la prestacion matcheada
const check = (exportada, registroVacuna) => {
    return exportada.info_enviada.aplicacionVacuna.vacuna === registroVacuna.valor.vacuna.vacuna.codigo &&
        exportada.info_enviada.aplicacionVacuna.ordenDosis === registroVacuna.valor.vacuna.dosis.orden;
};

export = run;
