export const logKeys = {
    mpiInsert: {
        key: 'mpi:paciente:insert',
        operacion: 'Insert paciente MPI'
    },
    mpiUpdate: {
        key: 'mpi:paciente:update',
        operacion: 'Update paciente MPI'
    },
    mpiUpdateContact: {
        key: 'mpi:paciente:updateContacto',
        operacion: 'Update contacto paciente'
    },
    mpiBuscarPaciente: {
        key: 'mpi:paciente:buscar',
        operacion: 'Buscar paciente'
    },
    mpiUpdaterStart: {
        key: 'mpi:mpiUpdater:start',
        operacion: 'MPI updater start'
    },
    mpiUpdaterFinish: {
        key: 'mpi:mpiUpdater:finish',
        operacion: 'MPI updater finish'
    },
    elasticCheck1: {
        key: 'elastic:notFound:andes',
        operacion: 'Paciente en Andes no encontrado en elastic'
    },
    elasticCheck2: {
        key: 'elastic:notFound:mpi',
        operacion: 'paciente en MPI no encontrado en elastic'
    },
    elasticCheck3: {
        key: 'andes:notFound',
        operacion: 'paciente en elasticsearch no encontrado en ANDES/MPI'
    },
    elasticFix: {
        key: 'elasticFix:error',
        operacion: 'error en el proceso'
    },
    elasticFix2: {
        key: 'elasticFix:update',
        operacion: 'Documentos referidos al paciente modificados'
    },
    turnosMobileUpdate: {
        key: 'citas:bloques:modificar',
        operacion: 'setea a 0 turnos disponibles para app mobile'
    }
};