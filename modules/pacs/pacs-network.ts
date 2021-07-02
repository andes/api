import { services } from '../../services';
import { handleHttpRequest } from '../../utils/requestHandler';
import { IPacsConfig } from './pacs-config.schema';


export async function loginPacs(pacsConfig: IPacsConfig) {

    const response = await services.get('dcm4chee-login').exec({
        host: pacsConfig.auth.host,
        clientId: pacsConfig.auth.clientId,
        clientSecret: pacsConfig.auth.clientSecret
    });

    return response.access_token;
}

export async function createPaciente(pacsConfig: IPacsConfig, data: any, token: string) {

    const response = await services.get('dcm4chee-create-paciente').exec({
        host: pacsConfig.host,
        aet: pacsConfig.aet,
        token,
        paciente: data
    });

    return response;
}

export async function createWorkList(pacsConfig: IPacsConfig, data: any, token: string) {

    const response = await services.get('dcm4chee-programar-estudio').exec({
        host: pacsConfig.host,
        aet: pacsConfig.aet,
        token,
        estudio: data
    });

    return response;
}


export async function enviarInforme(pacsConfig: IPacsConfig, uid: string, data: any, pdf: any, token: string) {
    const fs = require('fs');
    const url = `${pacsConfig.host}/dcm4chee-arc/aets/${pacsConfig.aet}/rs/studies/${uid}`;
    const [status, body] = await handleHttpRequest({
        method: 'POST',
        url,
        headers: {
            Authorization: 'Bearer ' + token,
            'content-type': 'multipart/related; type=\"application/dicom+json\"'
        },
        preambleCRLF: true,
        postambleCRLF: true,
        multipart: [

            {
                'content-type': 'application/dicom+json',
                body: JSON.stringify([data]),
            },
            {
                'content-type': 'application/pdf',
                'content-Location': 'informe.pdf',
                body: fs.createReadStream(pdf),
            }
        ]
    });
    if (status >= 200 && status < 300) {
        return body;
    }

    throw new Error(body);
}
