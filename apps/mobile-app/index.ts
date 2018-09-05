import * as express from 'express';
import { PacienteApp } from './schemas/pacienteApp';
import { DeviceModel } from './schemas/device';

/**
 * el requiredir viene trayendo problemas cada tanto. Porque quedan archivos .js huerfanos que los detecta igual.
 * Para seguir usandolo sería bueno compilar con typescript en otro directorio.
 * Es un detalle menor.
 *
 * Tambien esta este issue de Jest para dejar de usar require-dir
 * https://github.com/aseemk/requireDir/issues/53
 *
 */

export const Router = express.Router();
const routes = [
    './routes/autenticacionApp',
    './routes/farmacias',
    './routes/rup-adjuntos',
    './routes/accounts',
    './routes/devices',
    './routes/paciente',
    './routes/turnos',
    './routes/vacunas'
];
for (const r of routes) {
    Router.use(require(r));
}

export * from './controller';

export const Schemas = {
    PacienteApp,
    DeviceModel
};
