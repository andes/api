"use strict";
// Configuración SISA
exports.usuarioSisa = 'bcpintos';
exports.passwordSisa = '*123456';
// Configuración de Mongoose
exports.mongooseDebugMode = false;
exports.connectionStrings = {
    //mongoDB_main: 'mongodb://10.1.62.17/andes',
    elastic_main: 'localhost:9200',
    mongoDB_main: 'mongodb://localhost/andes'
};
// Habilita/deshabilita módulos de la API
exports.modules = {
    tm: {
        active: true,
        path: "./core/tm/routes",
        route: "/core/tm"
    },
    mpi: {
        active: true,
        path: "./core/mpi/routes",
        route: "/core/mpi"
    },
    auditoria: {
        active: true,
        path: "./core/mpi/routes/auditoria",
        route: "/core/mpi/auditoria"
    },
    turnos: {
        active: true,
        path: "./modules/turnos/routes",
        route: "/modules/turnos"
    },
};
//# sourceMappingURL=config.js.map