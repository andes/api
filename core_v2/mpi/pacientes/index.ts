export { PacienteCtr } from './paciente.controller';
export * from './paciente.interface';
export * from './paciente.schema';
export { Routing } from './paciente.routes';

/**
 * Para que se carguen los eventos
 */
require('./paciente.event');
