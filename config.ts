// !!!!!!!! ATENCIÓN !!!!!!!!
// Todas los datos privados (credenciales, IPs, ...) deben quedar en el archivo config.private.ts
// !!!!!!!!!!!!!!!!!!!!!!!!!!

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
        auth: false,
    },
    term: {
        active: true,
        path: './core/term/routes',
        route: '/core/term',
        auth: false,
    },
    log: {
        active: true,
        path: './core/log/routes',
        route: '/core/log',
        auth: true,
    },
    status: {
        active: true,
        path: './core/status/routes',
        route: '/core/status',
        auth: false, // Son APIs públicas
    },
    mpi: {
        active: true,
        path: './core/mpi/routes',
        route: '/core/mpi',
        auth: true,
    },
    auditoria: {
        active: true,
        path: './core/mpi/routes/auditoria',
        route: '/core/mpi/auditoria',
        auth: true,
    },
    turnos: {
        active: true,
        path: './modules/turnos/routes',
        route: '/modules/turnos',
        auth: true,
    },
    rup: {
        active: true,
        path: './modules/rup/routes',
        route: '/modules/rup',
        auth: true,
    },
    llaves: {
        active: true,
        path: './modules/llaves/routes',
        route: '/modules/llaves',
        auth: true,
    },
    auditorias: { // Auditorías RUP (prestacionPaciente)
        active: true,
        path: './modules/auditorias/routes',
        route: '/modules/auditorias',
        auth: true,
    },
};

// Cotas de consumo de APIs
export const defaultLimit = 50;
export const maxLimit = 1000;

// Configuracion MPI
export const mpi = {
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
    }
};
