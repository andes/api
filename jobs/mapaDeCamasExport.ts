import * as configPrivate from './../config.private';
import { log as andesLog } from '@andes/log';
import { handleHttpRequest } from './../utils/requestHandler';

let logRequest = {
    user: {
        usuario: { nombre: 'mapaDeCamasExport', apellido: 'mapaDeCamasExport' },
        app: 'jobExportMapaDeCamas',
        organizacion: 'Subsecretaría de salud'
    },
    ip: 'localhost',
    connection: {
        localAddress: ''
    }
};


export async function exportInternacion(done) {

    let url_query = configPrivate.hosts.BI_QUERY + '/queries?nombre=camas_occupations';
    let querys = await handleHttpRequest({
        method: 'GET',
        uri: url_query
    });

    if (querys && querys[0] === 200) {
        let respuesta = JSON.parse(querys[1]);
        let organizaciones = respuesta && respuesta[0].data;

        const fechaActual = new Date();
        let fechaDesde = new Date();
        fechaDesde.setHours(fechaDesde.getHours() - 8);
        let url_occupations = configPrivate.hosts.BI_QUERY + '/queries/camas_occupations/export';
        let url_checkouts = configPrivate.hosts.BI_QUERY + '/queries/camas_checkouts/export';


        for (let i = 0; i < organizaciones.length; i++) {
            try {
                let dataOccupations = {
                    params: {
                        organizacion: organizaciones[i].idOrganizacion,
                        capa: organizaciones[i].capa,
                        fecha: fechaActual
                    }
                };

                let dataCheckouts = {
                    params: {
                        organizacion: organizaciones[i].idOrganizacion,
                        capa: organizaciones[i].capa,
                        fechaDesde,
                        fechaHasta: fechaActual
                    }
                };

                await handleHttpRequest({
                    method: 'POST',
                    uri: url_occupations,
                    body: dataOccupations,
                    json: true,
                    timeout: 50000,
                });

                await handleHttpRequest({
                    method: 'POST',
                    uri: url_checkouts,
                    body: dataCheckouts,
                    json: true,
                    timeout: 50000,
                });

            } catch (error) {
                await andesLog(logRequest, 'andes:mapaDeCamas:bi', null, 'export', null, null, 'Error exportando mapa de camas');
                return (done(error));
            }
        }

    } else {
        await andesLog(logRequest, 'andes:mapaDeCamas:bi', null, 'export', null, null, 'Error exportando mapa de camas');
    }

    done();
}
