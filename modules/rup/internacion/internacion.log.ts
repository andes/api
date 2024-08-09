import { Connections } from '../../../connections';
import { Logger } from '@andes/log';

export const internacionCamaEstadosLog = new Logger({
    connection: Connections.logs,
    module: 'internacion',
    type: 'cama-estados',
    application: 'andes',
    bucketBy: 'd',
    bucketSize: 100,
    expiredAt: '2 M'
});

export const internacionCensosLog = new Logger({
    connection: Connections.logs,
    module: 'internacion',
    type: 'censos',
    application: 'andes',
    bucketBy: 'd',
    bucketSize: 100,
    expiredAt: '2 M'
});
