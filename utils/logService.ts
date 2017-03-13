import * as log from '../core/log/schemas/log';


export class Logger {

    public static log(res, hardcoded, callback?): any {
        let newLog = new log.log(hardcoded);
        console.log(hardcoded)
        newLog.save(callback);
        return newLog;
    }

    public static logParams(res, hardcoded, mod, op, callback?): any {
        console.log(hardcoded)
        hardcoded.operacion = op;
        hardcoded.modulo = mod;
        let newLog = new log.log(hardcoded);
        newLog.save(callback);
        return newLog;
    }

}
