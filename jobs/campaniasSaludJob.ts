import { NotificationService } from '../modules/mobileApp/controller/NotificationService';
import * as campaniasCtrl from '../core/tm/controller/campaniasSalud';
import * as authController from '../modules/mobileApp/controller/AuthController';
import * as moment from 'moment';

/**
 * Job que envía notificaciones push en forma masiva a todos los pacientes que tienen la app mobile activa y con un paciente asociado.
 * @param done
 */
async function run(done) {
    try {
        const today = new Date(moment().format('YYYY-MM-DD'));
        const campanias: any = await campaniasCtrl.campaniasVigentes(today);
        if (campanias.length > 0) {
            campanias.forEach(async c => {
                const ids: any = await authController.getPatientIdEnabledAccounts();
                ids.forEach(i => {
                    const datos = {
                        account: i,
                        campania: c
                    };
                    NotificationService.notificarCampaniaSalud(datos);
                    return done;
                });
            });

        } else {
            return done;
        }

    } catch (e) {
        return done;
    }
}

export = run;
