/**
 * Función que verifica la última vez que se actualizó/logueó un usuario.
 * Si es mayor o igual a 3 mes se desactiva,
 * cambiando la variable activo que se encuentra en cada organización a false.
 */
import * as moment from 'moment';
import { AuthUsers } from '../../../auth/schemas/authUsers';

export async function verificarUltimoLogueo(done) {
    const usuarios: any = AuthUsers.find({ 'organizaciones.activo': true }).cursor({ batchSize: 100 });
    const fLimite = moment().subtract(3, 'months').toDate();
    const fSinLogin = moment().subtract(4, 'months').toDate();
    for await (const user of usuarios) {
        for (const org of user.organizaciones) {
            if (!org.lastLogin && !user.lastLogin && !user.updatedAt && !user.createdAt) {
                org.lastLogin = fSinLogin;
            }

            const lastUpdate = [org.lastLogin, user.lastLogin, user.updatedAt, user.createdAt]
                .filter(date => date)
                .sort((a, b) => moment(b).valueOf() - moment(a).valueOf())[0];

            if (moment(lastUpdate).isBefore(fLimite)) {
                org.activo = false;
            }
        }
        await AuthUsers.updateOne(
            { _id: user._id },
            {
                $set: {
                    organizaciones: user.organizaciones
                }
            }
        );
    }

    done();
}
