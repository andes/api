import * as express from 'express';

export let Router = express.Router();

/**
 * el requiredir viene trayendo problemas cada tanto. Porque quedan archivos .js huerfanos que los detecta igual.
 * Para seguir usandolo sería bueno compilar con typescript en otro directorio.
 * Es un detalle menor.
 */

let routes = [
    './auth_routes/autenticacionApp',
    './auth_routes/authAppv2',
    './auth_routes/farmacias',
    './auth_routes/rup-adjuntos',

    './routes/accounts',
    './routes/devices',
    './routes/paciente',
    './routes/turnos',
    './routes/vacunas'
];

for (let r of routes) {
    Router.use(require(r));
}


import { PacienteApp } from './schemas/pacienteApp';
import { DeviceModel } from './schemas/device';

export let Schemas = {
    PacienteApp,
    DeviceModel
};
