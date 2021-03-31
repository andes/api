import { Prestacion } from './../modules/rup/schemas/prestacion';

async function run(done) {
    const parametros = {
        'ejecucion.fecha': {$gt: new Date('2020-12-27T00:00:00.000-03:00')},
        'estadoActual.tipo': 'validada',
        'ejecucion.registros.concepto.conceptId': '840534001',
        'tags.vacunasCovid': {$exists: false}
    };

    const prestaciones = Prestacion.find(parametros).cursor({ batchSize: 100 });
    let i = 0;
    for await (const prestacion of prestaciones) {
        i++;
        // tslint:disable-next-line:no-console
        if (i % 100 === 0) { console.log(i); }

        const $set: any = {
            tags: {vacunasCovid: true},
        };
        await Prestacion.update(
            { _id: prestacion.id },
            { $set }
        );

    }
    done();
}

export = run;

