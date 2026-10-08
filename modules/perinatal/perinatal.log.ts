import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const perinatalLog = new Logger({
    connection: Connections.logs,
    module: 'perinatal',
    type: 'perinatal-fechaFinEmbarazo',
    application: 'andes',
    expiredAt: '3 M' // se tomo en referencia (sisa, laboratorio, hl7v2, citas);
});
