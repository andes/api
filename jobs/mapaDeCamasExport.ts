import * as configPrivate from './../config.private';
import { handleHttpRequest } from './../utils/requestHandler';

export async function exportInternacion(done) {
    let organizaciones = [
        {
            idOrganizacion: '57e9670e52df311059bc8964',
            capa: 'medica'
        },
        {
            idOrganizacion: '5ee25d953e05fb20ef621e7a',
            capa: 'medica'
        },
        {
            idOrganizacion: '5bae6b7b9677f95a425d9ee8',
            capa: 'estadistica'
        }
    ];


    const fechaActual = new Date();
    let fechaDesde = new Date();
    fechaDesde.setHours(fechaDesde.getHours() - 8);
    let url_occupations = configPrivate.hosts.BI_QUERY + '/queries/camas_occupations/export';
    let url_checkouts = configPrivate.hosts.BI_QUERY + '/queries/camas_checkouts/export';

    for (let i = 0; i < organizaciones.length; i++) {

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
    }

    done();
}