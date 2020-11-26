import * as configPrivate from './../config.private';
import { handleHttpRequest } from './../utils/requestHandler';


async function run(done) {

    const params = {
        desde: new Date(2020, 0, 1),
        hasta: new Date()
    };
    let url_paciente_ultima_prestacion = configPrivate.hosts.BI_QUERY + '/queries/paciente_ultima_prestacion/export';
    try {
        await handleHttpRequest({
            method: 'POST',
            uri: url_paciente_ultima_prestacion,
            body: { params },
            json: true,
            timeout: 50000,
        });
    } catch (error) {
        return (done(error));
    }
    done();
}

export = run;
