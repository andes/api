import { Connections } from '../../../connections';
import { Logger } from '@andes/log';

export const arancelamientoLog = new Logger({ connection: Connections.logs, module: 'arancelamiento', type: 'descarga-comprobante', application: 'andes' });
