import { Connections } from '../../../connections';
import { Logger } from '@andes/log';

export const rupEventsLog = new Logger({
    connection: Connections.logs,
    module: 'rup',
    type: 'rup-events',
    application: 'andes',
    bucketBy: 'd',
    bucketSize: 100,
    expiredAt: '2 M'
});
