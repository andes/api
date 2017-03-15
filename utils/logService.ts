import * as log from '../core/log/schemas/log';


export class Logger {

   /* public static log(res, hardcoded, callback?): any {
        let newLog = new log.log(hardcoded);
        console.log(hardcoded);
        newLog.save(callback);
        return newLog;
    }*/

    public static log(req, mod, op, data?, callback?): any {
        let newLog = new log.log({
            fecha: new Date(),
            usuario: req.user.usuario,
            organizacion: req.user.organizacion,
            modulo: mod,
            operacion: op,
            datosOperacion: data,
            cliente: { ip: req.ip, app: 'desktop' },
            servidor: {
                ip: req.connection.localAddress
            }
        });
        newLog.save(callback);
        return newLog;
    }
}
