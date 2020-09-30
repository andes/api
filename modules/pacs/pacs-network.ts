import { handleHttpRequest } from '../../utils/requestHandler';
import { IPacsConfig } from './pacs-config.schema';

export async function loginPacs(pacsConfig: IPacsConfig) {
    const url = `${pacsConfig.auth.host}/auth/realms/dcm4che/protocol/openid-connect/token`;
    const [status, body] = await handleHttpRequest({
        method: 'POST',
        url,
        headears: {
            Accept: 'application/json'
        },
        form: {
            grant_type: 'client_credentials',
            client_id: pacsConfig.auth.clientId,
            client_secret: pacsConfig.auth.clientSecret
        }
    });
    if (status >= 200 && status < 300) {
        const token = JSON.parse(body).access_token;
        return token;
    }
    throw new Error(body);
}

export async function createPaciente(pacsConfig: IPacsConfig, data: any, token: string) {
    const url = `${pacsConfig.host}/dcm4chee-arc/aets/${pacsConfig.aet}/rs/patients`;
    const [status, body] = await handleHttpRequest({
        method: 'POST',
        url,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
        },
        json: true,
        body: data
    });
    if (status >= 200 && status < 300) {
        return body;
    }
    throw new Error(body);
}

export async function createWorkList(pacsConfig: IPacsConfig, data: any, token: string) {
    const url = `${pacsConfig.host}/dcm4chee-arc/aets/${pacsConfig.aet}/rs/mwlitems`;
    const [status, body] = await handleHttpRequest({
        method: 'POST',
        url,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
        },
        json: true,
        body: data
    });
    if (status >= 200 && status < 300) {
        return body;
    }
    throw new Error(body);
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
