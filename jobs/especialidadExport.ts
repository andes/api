import * as configPrivate from './../config.private';
import { log as andesLog } from '@andes/log';
import { handleHttpRequest } from './../utils/requestHandler';

const logRequest = {
    user: {
        usuario: { nombre: 'especialidadExport', apellido: 'especialidadExport' },
        app: 'jobExportEspecialidad',
        organizacion: 'Subsecretaría de salud'
    },
    ip: 'localhost',
    connection: {
        localAddress: ''
    }
};


export async function exportEspecialidad(done) {
    const params = {
        fecha: new Date()
    };
    const delete_especialidades = configPrivate.hosts.BI_QUERY + '/queries/profesionales-especialidad/delete';
    try {
        await handleHttpRequest({
            method: 'POST',
            uri: delete_especialidades,
            body: { params },
            json: true,
            timeout: 50000,
        });
    } catch (error) {
        await andesLog(logRequest, 'andes:profesionalesEspecialidad:bi', null, 'delete', null, null, 'Error eliminando especialidad de profesionales');
        return (done(error));
    }
    const url_especialidades = configPrivate.hosts.BI_QUERY + '/queries/profesionales-especialidad/export';
    try {
        await handleHttpRequest({
            method: 'POST',
            uri: url_especialidades,
            body: { params },
            json: true,
            timeout: 50000,
        });
    } catch (error) {
        await andesLog(logRequest, 'andes:profesionalesEspecialidad:bi', null, 'export', null, null, 'Error exportando especialidad de profesionales');
        return (done(error));
    }
    done();
}

