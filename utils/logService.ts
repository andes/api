import * as log from '../core/log/schemas/log';


export class LogFunction {

    public static logging(hardcoded, res, callback): any {

        let newLog = new log.log(hardcoded);
        newLog.save(callback);
        return newLog;
    }
}
