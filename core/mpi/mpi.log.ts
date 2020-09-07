import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const mpiLog = new Logger({ connection: Connections.logs, module: 'mpi', type: 'mpi-corrector', application: 'andes' });
