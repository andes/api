import { Auth } from '../auth/auth.class';
import { userScheduler } from '../config.private';
import { Prestacion, PrestacionHistorial } from '../modules/rup/schemas/prestacion';

async function run(done) {
    const query = {
        'estadoActual.tipo': { $in: ['modificada', 'anulada'] },
        inicio: { $ne: 'top' }
    };
    const prestaciones = Prestacion.find(query).cursor({ batchSize: 100 });

    const migrarPrestaciones = async (prestacion) => {
        try {
            const raw = prestacion.toJSON();
            const newPrestacionHistorial = new PrestacionHistorial(raw);
            Auth.audit(newPrestacionHistorial, userScheduler as any);
            await newPrestacionHistorial.save({ validateBeforeSave: false });
            await Prestacion.remove({ _id: prestacion.id });

        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
        }
    };

    await prestaciones.eachAsync(async (prest: any) => {
        await migrarPrestaciones(prest);
    });

    done();
}

export = run;
