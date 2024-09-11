import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const adt04Hl7v2Log = new Logger({
    connection: Connections.logs,
    module: 'hl7v2',
    type: 'adt04',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});
