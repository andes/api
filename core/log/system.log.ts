import { Logger } from '@andes/log';
import { Connections } from '../../connections';

export const SystemLog = new Logger({
    application: 'andes',
    connection: Connections.logs,
    module: 'system',
    type: 'sistema',
    bucketBy: 'h',
    bucketSize: 1000,
    expiredAt: '2 M'
});
