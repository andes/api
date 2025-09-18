import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const laboratorioLog = new Logger({
    connection: Connections.logs,
    module: 'laboratorio',
    type: 'laboratorios-SIL2',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});
