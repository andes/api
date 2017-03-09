import * as log from '../core/log/schemas/log';


export class LogFunction {

    public static logging(hardcoded, res, callback): any {
        console.log("ENTRO A LA FUNCIOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOON")
        let newLog = new log.log(hardcoded);
        newLog.save(callback);
        return newLog;
    }
}
