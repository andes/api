import { Connections } from '../../../connections';
import { Logger } from '@andes/log';

export const matriculacionLog = new Logger({
    connection: Connections.logs,
    module: 'matriculaciones',
    type: 'matriculaciones',
    application: 'andes',
    bucketBy: 'd',
    bucketSize: 100,
    expiredAt: '2 M'
});
