import { Connections } from '../../../connections';
import { Logger } from '@andes/log';

export const updateLog = new Logger({
    connection: Connections.logs,
    module: 'recetas-insumo',
    type: 'update',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '6 M'
});

export const informarLog = new Logger({
    connection: Connections.logs,
    module: 'recetas-insumo',
    type: 'informar-receta-insumo',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});

export const createLog = new Logger({
    connection: Connections.logs,
    module: 'recetas-insumo',
    type: 'crear-receta-insumo',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});

export const jobsLog = new Logger({
    connection: Connections.logs,
    module: 'recetas-insumo',
    type: 'jobs',
    application: 'andes',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '6 M'
});
