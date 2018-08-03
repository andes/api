import * as express from 'express';
import { PacienteApp } from './schemas/pacienteApp';
import { DeviceModel } from './schemas/device';
import * as AuthController from './controller/AuthController';
import * as VacunasController from './controller/VacunasController';
import * as NotificationService from './controller/NotificationService';

/**
 * el requiredir viene trayendo problemas cada tanto. Porque quedan archivos .js huerfanos que los detecta igual.
 * Para seguir usandolo sería bueno compilar con typescript en otro directorio.
 * Es un detalle menor.
 */

export let Router = express.Router();
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


export let Controllers = {
    AuthController,
    VacunasController,
    NotificationService: NotificationService.NotificationService
};

export let Schemas = {
    PacienteApp,
    DeviceModel
};
