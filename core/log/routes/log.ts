import * as express from 'express';
import * as log from '../../../core/log/schemas/log';
import * as logService from '../../../utils/logService';

let router = express.Router();

let token = {
    id: '26108063',
    usuario: {
        nombreCompleto: 'Juan Francisco Gabriel',
        nombre: 'Juan',
        apellido: 'Gabriel',
        username: '26108063',
        documento: '26108063'
    },
    roles: ['medico'],
    organizacion: {
        id: 1,
        nombre: 'Hospital Provincial Neuquén'
    },
    permisos: [
        'printer:xpc5000:print',
        'printer:xpc4000:*',
        'printer:hp,samsung:read',
    ]
};

let hardcoded = {

    fecha: '09/03/2017',
    id: token.id,
    usuario: token.usuario,
    organizacion: { nombre: token.organizacion.nombre },
    modulo: 'turnos',
    operacion: 'asignar turno',
    datosOperacion: 'aqui van los datos de la operacion',
    cliente: {
        ip: '127.0.0.1',
        app: 'escritorio'
    },
    servidor: {
        ip: '127.0.0.1',
    }
};

router.post('/log/', function (req, res, next) {

    let resultado = logService.LogFunction.logging(hardcoded, res, function (err) {

        if (err) {
            return next(err);
        }
        res.json(resultado);

    });

});

module.exports = router;
