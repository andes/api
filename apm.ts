export let APM = null;

export const APMIsActive = process.env.APM_SERVER && process.env.APM_APP_NAME;

if (APMIsActive) {
    APM = require('elastic-apm-node').start({
        serviceName: process.env.APM_APP_NAME,
        serverUrl: process.env.APM_SERVER,
    });
}
