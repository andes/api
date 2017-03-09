import * as log from '../core/log/schemas/log';

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
}



export class LogFunction {

    public static loguear(hardcoded, res, next): void {
        let newLog = new log.log(hardcoded);
        newLog.save((err) => {
            if (err) {
                return next(err);
            }
            res.json(newLog);
        });
    }
}
