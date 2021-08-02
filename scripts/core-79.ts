import { IPrestacionDoc } from '../modules/rup/prestaciones.interface';
import { Codificacion } from '../modules/rup/schemas/codificacion';
import { Prestacion } from '../modules/rup/schemas/prestacion';


async function run(done) {
    const codificaciones = Codificacion.find({}).cursor({ batchSize: 100 });
    let i = 0;
    for await (const codificacion of codificaciones) {
        i++;
        // eslint-disable-next-line no-console
        if (i % 100 === 0) { console.log(i); }

        const prestacion = await Prestacion.findById(codificacion.idPrestacion) as IPrestacionDoc;

        if (!prestacion) {
            continue;
        }

        const $set: any = {
            tipoPrestacion: prestacion.solicitud.tipoPrestacion,
            ambitoPrestacion: prestacion.solicitud.ambitoOrigen
        };

        if (!codificacion.updatedAt) {
            $set.updatedAt = codificacion.createdAt;
            $set.updatedBy = codificacion.createdBy;
        }

        await Codificacion.update(
            { _id: codificacion.id },
            { $set }
        );

    }
    done();
}

export = run;
