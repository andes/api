// !!!!!!!! ATENCIÓN !!!!!!!!
// Todas los datos privados (credenciales, IPs, ...) deben quedar en el archivo config.private.ts
// !!!!!!!!!!!!!!!!!!!!!!!!!!

import { Auth } from './auth/auth.class';

const appMiddleware = [
    Auth.authenticate(),
    // Auth.deniedPatients()
];

const mobileMiddleware = [
    Auth.authenticate()
];

/*
const publicMiddleware = [
    Auth.authenticatePublic()
];
*/


// Habilita/deshabilita módulos de la API
export const modules = {
    auth: {
        active: true,
        path: './auth/routes',
        route: '/auth'
    },
    tm: {
        active: true,
        path: './core/tm/routes',
        route: '/core/tm',
        middleware: null,
    },
    term: {
        active: true,
        path: './core/term/routes',
        route: '/core/term',
        middleware: null,
    },
    log: {
        active: true,
        path: './core/log/routes',
        route: '/core/log',
        middleware: appMiddleware
    },
    logV2: {
        active: true,
        path: './core/log.v2/routes',
        route: '/core/log.v2',
        // Disable Auth for tests
        middleware: null // appMiddleware
    },
    status: {
        active: true,
        path: './core/status/routes',
        route: '/core/status',
        middleware: null, // Son APIs públicas
    },
    mpi: {
        active: true,
        path: './core/mpi/routes',
        route: '/core/mpi',
        // TODO activar middleware de autenticación
        middleware: appMiddleware
    },
    auditoria: {
        active: true,
        path: './core/mpi/routes/auditoria',
        route: '/core/mpi/auditoria',
        middleware: appMiddleware
    },
    turnos: {
        active: true,
        path: './modules/turnos/routes',
        route: '/modules/turnos',
        middleware: appMiddleware
    },
    llaves: {
        active: true,
        path: './modules/llaves/routes',
        route: '/modules/llaves',
        middleware: appMiddleware
    },
    rup: {
        active: true,
        path: './modules/rup/routes',
        route: '/modules/rup',
        middleware: appMiddleware
    },
    auditorias: { // Auditorías RUP (prestacionPaciente)
        active: true,
        path: './modules/auditorias/routes',
        route: '/modules/auditorias',
        middleware: appMiddleware
    },
    turnos_mobile_auth: {
        active: true,
        path: './modules/mobileApp/auth_routes',
        route: '/modules/mobileApp',
        middleware: null
    },
    turnos_mobile: {
        active: true,
        path: './modules/mobileApp/routes',
        route: '/modules/mobileApp',
        middleware: mobileMiddleware
    },
    turnero: {
        active: true,
        path: './modules/turnero/routes',
        route: '/modules/turnero'
        // middleware: appMiddleware
    },
    fuentesAutenticas: {
        active: true,
        path: './modules/fuentesAutenticas/routes',
        route: '/modules/fuentesAutenticas',
        middleware: appMiddleware
    },
    usuarios: {
        active: true,
        path: './modules/usuarios/routes',
        route: '/modules/usuarios',
        middleware: appMiddleware
    },
    matriculaciones: {
        active: true,
        path: './modules/matriculaciones/routes',
        route: '/modules/matriculaciones',
        middleware: null
    },
    fhir: {
        active: true,
        path: './connect/fhir/routes',
        route: '/connect/fhir',
        middleware: appMiddleware
    },
    cda: {
        active: true,
        path: './modules/cda/routes',
        route: '/modules/cda',
        middleware: appMiddleware
    },
    descargas: {
        active: true,
        path: './modules/descargas/routes',
        route: '/modules/descargas',
        middleware: null
    },
    obraSocial: {
        active: true,
        path: './modules/obraSocial/routes',
        route: '/modules/obraSocial',
        middleware: null // appMiddleware
    },
    sugerencias: {
        active: true,
        path: './modules/sugerencias/routes',
        route: '/modules/sugerencias',
        middleware: appMiddleware
    },
    prestamosCarpetas: {
        active: true,
        path: './modules/prestamosCarpetas/routes',
        route: '/modules/prestamosCarpetas',
        middleware: appMiddleware
    },
    reglas: {
        active: true,
        path: './modules/top/routes',
        route: '/modules/top',
        middleware: appMiddleware
    },
    turnos_prestaciones: {
        active: true,
        path: './modules/estadistica/routes',
        route: '/modules/estadistica',
        middleware: appMiddleware
    },
    version: {
        active: true,
        path: './modules/version/routes',
        route: '/version'
    },
    webhook: {
        active: true,
        path: './modules/webhook/routes',
        route: '/modules/webhook'
    },
    configFacturacionAutomatica: {
        active: true,
        path: './modules/facturacionAutomatica/routes',
        route: '/modules/facturacionAutomatica',
        middleware: appMiddleware
    },
    carpetas: {
        active: true,
        path: './modules/carpetas/routes',
        route: '/modules/carpetas',
        middleware: appMiddleware
    },
    vacunas: {
        active: true,
        path: './modules/vacunas/routes',
        route: '/modules/vacunas',
        middleware: appMiddleware
    },
    geonode: {
        active: true,
        path: './modules/geonode/routes',
        route: '/modules/geonode',
        middleware: appMiddleware
    },
    georeferencia: {
        active: true,
        path: './modules/georeferencia/routes',
        route: '/modules/georeferencia',
    },
    perfiles: {
        active: true,
        path: './core/auth/routes',
        route: '/core/auth',
        middleware: appMiddleware
    }
};

// Cotas de consumo de APIs
export const defaultLimit = 50;
export const maxLimit = 1000;

// Configuracion MPI
export const algoritmo = 'Levenshtein';

export const mpi = {
    cotaAppMobile: 1,
    cotaMatchMin: 0.80,
    cotaMatchMax: 0.94,
    weightsDefault: {
        identity: 0.55,
        name: 0.10,
        gender: 0.3,
        birthDate: 0.05
    },
    weightsMin: {
        identity: 0.4,
        name: 0.6,
        gender: 0,
        birthDate: 0
    },
    weightsScan: {
        identity: 0.55,
        name: 0.10,
        gender: 0.3,
        birthDate: 0.05
    },
    weightsUpdater: {
        identity: 0.3,
        name: 0.3,
        gender: 0.1,
        birthDate: 0.3
    },
    weightsFaAnses: {
        identity: 0.1,
        name: 0.45,
        gender: 0.3,
        birthDate: 0.15
    },
    // En auditoria de la pacientes le quitamos importancia al DNI ya que es frecuente que este mal ya que mpi realiza control sobre DNI y Sexo con
    // matching muy altos.
    cotaMatchMinAuditoria: 0.75,
    cotaMatchMaxAuditoria: 0.85,
    weightsAuditoriaPacientes: {
        identity: 0.10,
        name: 0.40,
        gender: 0.35,
        birthDate: 0.15
    },
};

export const weightsVaccine = {
    identity: 0.3,
    name: 0.2,
    gender: 0.3,
    birthDate: 0.2
};

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
    mpiAuditoriaSetActivo: {
        key: 'mpi:auditoria:setActivo',
        operacion: 'Activar/desactivar paciente'
    },
    validacionPaciente: {
        key: 'mpi:validacion',
        operacion: 'Validar paciente'
    },
    elasticInsert: {
        key: 'elastic:paciente:insert',
        operacion: 'Insert paciente ElasticSearch'
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
    },
    regexChecker: {
        key: 'mpi:regexChecker',
        operacion: 'JOB: intenta corregir errores en nombre y apellido de pacientes'
    },
    usuarioCreate: {
        key: 'usuarios:crear',
        operacion: 'crea un usuario'
    },
    usuarioCreateError: {
        key: 'usuarios:crearError',
        operacion: 'error al crear un usuario'
    },
    usuarioUpdate: {
        key: 'usuarios:modificar',
        operacion: 'modifica los permisos de un usuario'
    },
    usuarioUpdateError: {
        key: 'usuarios:modificarError',
        operacion: 'error al modificar los permisos de un usuario'
    }
};
