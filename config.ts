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
    fhir: {
        active: true,
        path: './fhir/patient/routes',
        route: '/fhir/patient',
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
        middleware: appMiddleware
    },
    obraSocial: {
        active: true,
        path: './modules/obraSocial/routes',
        route: '/modules/obraSocial',
        middleware: appMiddleware
    },
    prestamosCarpetas: {
        active: true,
        path: './modules/prestamosCarpetas/routes',
        route: '/modules/prestamosCarpetas',
        middleware: appMiddleware
    },
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
    }
};
