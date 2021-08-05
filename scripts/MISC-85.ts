import { Codificacion } from '../modules/rup/schemas/codificacion';
import { Prestacion } from '../modules/rup/schemas/prestacion';


async function run(done) {
    const codificaciones = Codificacion.find({ estadoFacturacion: { $exists: true } }).cursor({ batchSize: 100 });
    let i = 0;
    for await (const codificacion of codificaciones) {
        i++;
        // eslint-disable-next-line no-console
        if (i % 100 === 0) { console.log(i); }

        if (codificacion.estadoFacturacion) {
            await Prestacion.updateOne(
                { _id: codificacion.idPrestacion },
                { $set: { estadoFacturacion: codificacion.estadoFacturacion } }
            );
        }

    }
    done();
}

export = run;
