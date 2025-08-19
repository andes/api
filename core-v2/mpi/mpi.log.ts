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

export const updateRelacionesLog = new Logger({
    connection: Connections.logs,
    module: 'mpi',
    type: 'mpi-update-relaciones',
    application: 'andes'
});

export const updatePacientesInternados = new Logger({
    connection: Connections.logs,
    module: 'mpi',
    type: 'mpi-update-internados',
    application: 'andes'
});
