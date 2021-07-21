import { Prestacion, PrestacionHistorial } from '../modules/rup/schemas/prestacion';
import { userScheduler } from '../config.private';
import { Auth } from '../auth/auth.class';
import { Types } from 'mongoose';

async function run(done) {
    const query = { $and: [{ 'estados.tipo': { $in: ['modificada', 'anulada'] } }, { inicio: { $ne: 'top' } }] };
    const prestaciones = Prestacion.find(query).cursor({ batchSize: 100 });

    const migrarPrestaciones = async (prestacion) => {
        try {
            const raw = prestacion.toJSON();
            const newPrestacionHistorial = new PrestacionHistorial(raw);
            Auth.audit(newPrestacionHistorial, userScheduler as any);
            await newPrestacionHistorial.save();
            await Prestacion.findOneAndRemove({ _id: prestacion.id });

        } catch (err) {
            // tslint:disable-next-line:no-console
            console.error(err);
        }
    };

    await prestaciones.eachAsync(async (prest: any) => {
        await migrarPrestaciones(prest);
    });

    done();
}

export = run;
