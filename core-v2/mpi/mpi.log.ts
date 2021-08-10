import { Connections } from '../../connections';
import { Logger } from '@andes/log';

export const mpiCorrectorLog = new Logger({
    connection: Connections.logs,
    module: 'mpi',
    type: 'mpi-corrector',
    application: 'andes'
});

export const mpiNacimientosLog = new Logger({
    connection: Connections.logs,
    module: 'mpi',
    type: 'mpi-nacimientos',
    application: 'andes'
});

export const updateValidadosLog = new Logger({
    connection: Connections.logs,
    module: 'mpi',
    type: 'mpi-update-validados',
    application: 'andes'
});

