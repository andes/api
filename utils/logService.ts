import * as log from '../core/log/schemas/log';


export class LogFunction {

    public static logging(hardcoded, res, op?, data?, callback?): any {
        let newLog = new log.log(hardcoded);
        if (op && data) {
            console.log('INSIDE OP & DATA');
            newLog.update(
                { operacion: op },
                { datosOperacion: data }
            );
        }
        newLog.save(
            function (err) {
                console.log(err);
            });
        return newLog;
    }
}


/*export class LogFunction {

    public static logging(hardcoded, res, op?, data?, callback?): any {
        let newLog = new log.log(hardcoded);
        if (op && data) {
            console.log('INSIDE OP & DATA');
            newLog.update(
                { operacion: op },
                { datosOperacion: data }
            );
        }
        newLog.save(callback);
        console.log(newLog);
        console.log(2);
        return newLog;
    }


}*/