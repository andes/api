import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const exportHudsLog = new Logger({ connection: Connections.logs, module: 'exportHuds', type: 'exportHuds', application: 'andes' });
