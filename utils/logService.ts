import * as log from '../core/log/schemas/log';

export class LogFunction {

    public static loguear(input: any, res, next): void {
        let newLog = new log.log(input);
        newLog.save((err) => {
            if (err) {
                return next(err);
            }
            res.json(newLog);
        });
    }
}
