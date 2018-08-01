import { logJobs } from '../core/log/schemas/logJobs';

export class LoggerJobs {

    public static log(job, msg, callback?): any {
        let newLogJobs = new logJobs({
            job: job,
            error: msg,
            createdAt: new Date(),
        });
        newLogJobs.save(callback);
        return newLogJobs;
    }
}
