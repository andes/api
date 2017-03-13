import * as express from 'express';
import * as log from '../../../core/log/schemas/log';
import { Logger } from '../../../utils/logService';
import { Auth } from '../../../auth/auth.class';

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

router.post('/log/', Auth.authenticate(), function (req, res, next) {
    let resultado = Logger.log(res, hardcoded, function (err) {
        if (err) {
            console.log(err);
            return next(err);
        }
        res.json(resultado);
    });
});

router.post('/log/:module/:op', function (req, res, next) {
    let operacion = '';
    let modulo = '';
    if (req.params.op) {
        operacion = 'lista espera';
    }
    if (req.params.module) {
        modulo = req.params.module;
    }
    let resultado = Logger.logParams(res, hardcoded, modulo, operacion, function (err) {
        if (err) {
            console.log(err);
            return next(err);
        }
        res.json(resultado);
    });
});

module.exports = router;
