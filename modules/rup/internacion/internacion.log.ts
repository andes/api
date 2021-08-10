import { Connections } from '../../../connections';
import { Logger } from '@andes/log';

export const prestacionAnuladaLog = new Logger({
    connection: Connections.logs,
    module: 'internacion',
    type: 'prestacion-anulada',
    application: 'andes'
});
