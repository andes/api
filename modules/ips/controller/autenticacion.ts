import * as jwt from 'jsonwebtoken';
import { IPS } from '../../../config.private';
import { handleHttpRequest } from '../../../utils/requestHandler';
export class SaludDigitalClient {
    // static SystemPatient = 'https://federador.msal.gob.ar/patient-id';

    private expiresIn = 60 * 15 * 1000; /* 15 min */
    private token = 'jwt';
    private host: string;
    private hostBus: string;
    private dominio: string;
    private secret: string;

    constructor({dominio, host, secret, federador}) {
        this.dominio = dominio;
        this.host = host;
        this.hostBus = federador;
        this.secret = secret;
    }

    getDominio() {
        return this.dominio;
    }

    generacionTokenAut({ name, role, ident, sub }): any {
        const payload = {
            // jti: 'qwertyuiopasdfghjklzxcvbnm123457',
            name,
            role,
            ident,
            sub
        };
        return jwt.sign(payload, this.secret, {
            expiresIn: this.expiresIn,
            issuer: this.dominio,
            audience: 'www.bussalud.gov.ar/auth/v1'
        });
    }

    /**
     * Obtención de token de autenticacion
     */
    async obtenerToken(payload) {
        if (!IPS.auth) {
            return null;
        }
        const token: any = this.generacionTokenAut(payload);
        const url = `${this.host}/bus-auth/auth`;
        const options = {
            url,
            method: 'POST',
            json: true,
            body: {
                grantType: 'client_credentials',
                scope: 'Patient/*.read,Patient/*.write',
                clientAssertionType: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                clientAssertion: token
            },
        };
        const [status, body] = await handleHttpRequest(options);
        this.token = body.accessToken;
        return this.token;
    }

    /**
     * Valida un accessToken
     */

    async validarToken(token: any) {
        const url = `${this.host}/bus-auth/tokeninfo`;
        const options = {
            url,
            method: 'POST',
            json: true,
            body: {
                accessToken: token
            },
        };
        const [status, body] = await handleHttpRequest(options);
        return status >= 200 && status <= 299;
    }

    async federar(patient: any) {
        const url = `${this.host}/masterfile-federacion-service/fhir/Patient/`;
        const options = {
            url,
            method: 'POST',
            json: true,
            body: patient,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.token}`
            }
        };
        const [status, body] = await handleHttpRequest(options);
        return status >= 200 && status <= 299;
    }

    // Search provisorio
    async search(params: any, token: any) {
        const url = `${this.host}/masterfile-federacion-service/fhir/Patient/$match`;
        const options = {
            url,
            method: 'POST',
            // qs: params,
            body: params,
            json: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.token}`
            }
        };
        const [status, bundle] = await handleHttpRequest(options);
        return (bundle.total > 0 ? bundle.entry.map(e => e) : []);
    }

    async getDominios(idPaciente) {
        const url = `${this.host}/masterfile-federacion-service/fhir/Patient/$patient-location?identifier=${this.dominio}|${idPaciente}`;
        const options = {
            url,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.token}`
            }
        };
        const [status, body] = await handleHttpRequest(options);
        if (status >= 200 && status <= 399) {
            const bundle = JSON.parse(body);
            if (bundle.total > 0) {
                return bundle.entry.map((r) => {
                    return {
                        id: r.resource.id,
                        name: r.resource.name,
                        identifier: r.resource.identifier.find(iden => iden.system === 'https://federador.msal.gob.ar/uri')
                    };
                });
            }
        } else {
        }
        return [];

    }

    async solicitud({ custodian = null, fechaDesde = null, fechaHasta = null, patient, loinc }) {
        try {
            let url = `${this.hostBus}/DocumentReference?subject:identifier=${this.dominio}|${patient}&custodian=${custodian}&type=https://loinc.org|${loinc}`;
            if (fechaDesde) {
                url += `&date=ge${fechaDesde}`;
            }
            if (fechaHasta) {
                url += `&date=le${fechaHasta}`;
            }
            const options = {
                url,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${this.token}`
                }
            };
            const [status, body] = await handleHttpRequest(options);
            if (status >= 200 && status <= 399) {
                const bundle = JSON.parse(body);
                if (bundle.entry.length > 0) {
                    const resp = bundle.entry.map((r) => {
                        return {
                            id: r.resource.id,
                            identifier: r.resource.identifier,
                            custodian,
                            urlBinary: r.resource.content[0].attachment.url
                        };
                    });
                    return resp;
                }
            } else {
                return [];
            }

        } catch (err) {
            return err;
        }
    }

    async getBinary(urlBinary) {
        const url = `${this.hostBus}/${urlBinary}`;
        const options = {
            url,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.token}`
            }
        };
        const [status, body] = await handleHttpRequest(options);
        if (status >= 200 && status <= 300) {
            return JSON.parse(body);
        }
    }
}


/**
 * Otra consulta con el host y las url:
https://testapp.hospitalitaliano.org.ar/masterfile-federacion-service/fhir/Patient
https://testapp.hospitalitaliano.org.ar/fhir/DocumentReference
https://testapp.hospitalitaliano.org.ar/masterfile-federacion-service/fhir/Patient/$patient-location
 */
