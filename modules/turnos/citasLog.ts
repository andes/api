import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const agendaLog = new Logger({
    connection: Connections.logs,
    module: 'citas',
    type: 'agenda',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});

export const turnosLog = new Logger({
    connection: Connections.logs,
    module: 'citas',
    type: 'turno',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});

export const demandaLog = new Logger({
    connection: Connections.logs,
    module: 'citas',
    type: 'demanda-turno',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});

export const notificacionesLog = new Logger({
    connection: Connections.logs,
    module: 'msNotificaciones',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});
