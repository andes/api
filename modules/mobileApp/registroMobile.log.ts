import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const registroMobileLog = new Logger({ connection: Connections.logs, module: 'mobile', type: 'registro', application: 'andes' });
