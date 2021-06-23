import { Connections } from '../../../connections';
import { Logger } from '@andes/log';

export const laboratorioCentralLog = new Logger({
    connection: Connections.logs,
    module: 'laboratorioCentral',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100
});
