
import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const cdaLog = new Logger({ connection: Connections.logs, module: 'cda', type: 'paciente', application: 'andes' });
