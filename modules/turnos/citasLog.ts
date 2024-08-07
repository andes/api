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
export const demandaLog = new Logger({
    connection: Connections.logs,
    module: 'citas',
    type: 'demanda-turno',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100
});

export const notificacionesLog = new Logger({
    connection: Connections.logs,
    module: 'msNotificaciones',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100
});
