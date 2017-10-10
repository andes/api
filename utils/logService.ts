import * as log from '../core/log/schemas/log';

export class Logger {

    /**
     *
     * @param {any} req http req
     * @param {any} mod modulo - enumerado en log schema
     * @param {any} op operación - enumerado en log schema
     * @param {any} [data] datos de la operación para incluir en el log
     * @param {any} [callback]
     * @returns {*} new log
     * @memberof Logger
     */
    public static log(req, mod, op, data?, callback?): any {
        let newLog = new log.log({
            fecha: new Date(),
            usuario: req.user.usuario,
            organizacion: req.user.organizacion,
            modulo: mod,
            operacion: op,
            datosOperacion: data,
            cliente: {
                ip: req.ip,
                app: 'desktop'
            },
            servidor: {
                ip: req.connection.localAddress
            }
        });
        newLog.save(callback);
    }
}
