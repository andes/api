import { EventCore } from '@andes/event-bus';
import * as controller from '../modules/forms/forms-epidemiologia/controller/forms-epidemiologia.controller';

export async function importLAMPResults(done) {
    const fichasLAMP = await controller.getLAMPPendientes();
    EventCore.emitAsync('notificacion:epidemio:lamp', fichasLAMP);
    done();
}