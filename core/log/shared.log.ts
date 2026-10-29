import { Logger } from '@andes/log';
import { Connections } from '../../connections';

/**
 * Destinado a loguear errores manejados por angular desde el front de andes a través de la libreria shared
 */

export const SharedLog = new Logger({
    application: 'andes',
    connection: Connections.logs,
    module: 'shared',
    type: 'angular-error',
    bucketBy: 'h',
    bucketSize: 100,
    expiredAt: '3 M'
});
