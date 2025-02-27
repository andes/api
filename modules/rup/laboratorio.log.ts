import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const laboratorioLog = new Logger({
    connection: Connections.logs,
    module: 'laboratorio',
    application: 'andes',
    type: 'laboratorios',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});

export const protocoloLog = new Logger({
    connection: Connections.logs,
    module: 'laboratorio',
    application: 'andes',
    type: 'protocolo',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});
