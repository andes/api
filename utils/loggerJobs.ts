import { logJobs } from '../core/log/schemas/logJobs';

export class LoggerJobs {

    public static log(job, msg, callback?): any {
        const newLogJobs = new logJobs({
            job,
            error: msg,
            createdAt: new Date(),
        });
        newLogJobs.save(callback);
        return newLogJobs;
    }
}
