import { Types } from 'mongoose';
import { Codificacion } from '../modules/rup/schemas/codificacion';
import { Prestacion } from '../modules/rup/schemas/prestacion';


async function run(done) {

    let codificaciones;
    if (process.argv.length === 5) {
        const fechaDesde = new Date(process.argv[3]);
        const fechaHasta = new Date(process.argv[4]);
        codificaciones = Codificacion.find({
            createdAt:{ $gte:fechaDesde, $lte:fechaHasta }
        }).cursor({ batchSize: 100 });
    } else {
        codificaciones = Codificacion.find({ }).cursor({ batchSize: 100 });
    }
    for await (const codificacion of codificaciones) {
        const prestacionId = Types.ObjectId(codificacion.idPrestacion);
        const prestacion: any = await Prestacion.find({ _id : prestacionId });
        if (prestacion.length) {
            const profesionalId = prestacion[0].solicitud.profesional.id;
            await Codificacion.update(
                { _id: codificacion._id },
                { $set: { idProfesional : profesionalId } },
            );
        }
    }
    done();
}

export = run;
