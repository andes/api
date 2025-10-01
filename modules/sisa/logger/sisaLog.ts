import { Connections } from '../../../connections';
import { Logger } from '@andes/log';

export const sisaLog = new Logger({
    connection: Connections.logs,
    type: 'interoperabilidad',
    module: 'sisa',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});

export const sisaProfesionalLog = new Logger({
    connection: Connections.logs,
    type: 'profesional-sisa',
    module: 'msProfesionalSISA',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});
