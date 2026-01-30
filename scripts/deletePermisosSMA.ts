import { AuthUsers } from '../auth/schemas/authUsers';
import { Types } from 'mongoose';
import { Auth } from '../auth/auth.class';
import { userScheduler } from '../config.private';

async function run(done) {
    const idEfectorSMA = Types.ObjectId('57fcf037326e73143fb48b77');
    const cursor = AuthUsers.find({ $and: [{ _id: Types.ObjectId('59e76173b7c39e57a13b38d5') }, { 'organizaciones._id': idEfectorSMA }] }).cursor({ batchSize: 100 });
    try {
        const deletePermisoSMA = async (usuario) => {
            const index = usuario.organizaciones.findIndex(org => org.id.toString() === idEfectorSMA.toString());
            if (index !== -1) {
                usuario.organizaciones.splice(index, 1);
                Auth.audit(usuario, userScheduler as any);
                await usuario.save();
            }
        };
        await cursor.eachAsync(async usuario => {
            await deletePermisoSMA(usuario);
        });
    } catch (err) {
        return;
    }
    done();
}

export = run;

