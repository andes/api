import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const agendaLog = new Logger({
    connection: Connections.logs,
    module: 'citas',
    type: 'agenda',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100
});
export const turnosLog = new Logger({
    connection: Connections.logs,
    module: 'citas',
    type: 'turno',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100
});
