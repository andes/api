import { EventCore } from '@andes/event-bus';
import * as vacunaCtr from './vacunas.controller';

EventCore.on('mobile:patient:login', async (account) => {
    await vacunaCtr.exportCovid19(null, account.pacientes[0]._id);
});
