import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const evolucionLog = new Logger({
    connection: Connections.logs,
    module: 'rup',
    type: 'evolucion',
    application: 'andes',
    bucketBy: 'd',
    bucketSize: 100,
    expiredAt: '3 M'
});

export function registrarEventoEvolucion(level: 'info' | 'error', action: string, data: any, error?: any) {
    try {
        const resultado = level === 'error'
            ? evolucionLog.error(action, data, error)
            : evolucionLog.info(action, data);
        if (resultado && typeof resultado.catch === 'function') {
            resultado.catch(() => null);
        }
    } catch (err) {
        return;
    }
}
