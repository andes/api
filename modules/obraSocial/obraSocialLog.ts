import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const obraSocialLog = new Logger({ connection: Connections.logs, module: 'obraSocial', type: 'puco', application: 'andes', bucketBy: 'h' });
