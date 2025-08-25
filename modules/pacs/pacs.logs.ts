import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const pacsLogs = new Logger({
    connection: Connections.logs,
    module: 'pacs',
    type: 'pacs-operations',
    application: 'andes',
    bucketBy: 'd',
    bucketSize: 100,
    expiredAt: '1 M'
});
