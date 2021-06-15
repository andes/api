import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const perinatalFechaFinEmbarazoLog = new Logger({ connection: Connections.logs, module: 'perinatal', type: 'perinatal-fechaFinEmbarazo', application: 'andes' });
