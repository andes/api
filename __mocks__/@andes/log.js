"use strict";
/**
 * Mock de @andes/log utilizado en los tests unitarios.
 *
 * La implementación real de Logger intenta crear índices en MongoDB
 * durante su instanciación, utilizando la conexión Connections.logs.
 *
 * En los tests unitarios esa conexión no está inicializada, por lo que
 * las operaciones createIndex quedan pendientes y eventualmente
 * producen errores de buffering timeout, impidiendo que Jest finalice.
 *
 * Este mock evita esos efectos secundarios y permite ejecutar los tests
 * sin depender de la conexión a la base de datos de logs.
 *
 * TODO: Revisar este mock cuando @andes/log permita desactivar
 * la creación automática de índices.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(options) {
        this.log = jest.fn();
        this.info = jest.fn();
        this.warn = jest.fn();
        this.error = jest.fn();
        this.debug = jest.fn();
        // No se inicializan conexiones ni índices.
    }
}
exports.Logger = Logger;
//# sourceMappingURL=log.js.map