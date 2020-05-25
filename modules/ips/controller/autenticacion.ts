import * as jwt from 'jsonwebtoken';
import { handleHttpRequest } from '../../../utils/requestHandler';

export class SaludDigitalClient {
    static SystemPatient = 'https://federador.msal.gob.ar/patient-id';

    private expiresIn = 60 * 15 * 1000;  /* 15 min */
    private token: string;
    private host: string;
    private dominio: string;
    private secret: string;

    constructor(dominio, host, secret) {
        this.dominio = dominio;
        this.host = host;
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
        const response = JSON.parse(body);
        this.token = response.accessToken;
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
                'Content-Type': 'application/json'
            }
        };
        const [status, body] = await handleHttpRequest(options);
        return status >= 200 && status <= 299;
    }

    async search(params: any) {
        const url = `${this.host}/masterfile-federacion-service/fhir/Patient/`;
        const options = {
            url,
            method: 'GET',
            qs: params,
            json: true,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const [status, bundle] = await handleHttpRequest(options);
        return (bundle.total > 0 ? bundle.entry.map(e => e.resource) : []);
    }

    async getDominios(idPaciente) {
        const url = `${this.host}/masterfile-federacion-service/fhir/Patient/$patient-location?identifier=${this.dominio}|${idPaciente}`;
        const options = {
            url,
            method: 'GET',
            headers: {
                Authorization: ''
            }
        };
        // https://bus.msal.gov.ar/dominios
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
        }
        return [];

    }

    async solicitud({ custodian = null, fechaDesde = null, fechaHasta = null, patient, loinc }) {
        // let url = `${this.host}/fhir/DocumentReference?subject:identifier=${this.dominio}|${patient}&class=https://loinc.org/|${loinc}`;
        let url = 'https://demo5647849.mockable.io/repositorio-documentos/fhir/DocumentReference%3Fsubject:Patient.identifier=http://www.hospitalitaliano.org.ar%7C540153&class=https://loinc.org/%7C60591-5';

        if (custodian) {
            url += `&custodian=${custodian}`;
        }
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
                Authorization: ''
            }
        };

        const [status, body] = await handleHttpRequest(options);
        if (status >= 200 && status <= 399) {
            const bundle = JSON.parse(body);
            if (bundle.total > 0) {
                const resp = bundle.entry.map((r) => {
                    return {
                        id: r.resource.id,
                        identifier: r.resource.identifier,
                        custodian: r.custodian,
                        urlBinary: r.content[0].attachment.url
                    };
                });

                return resp;
            }
        }
        return [];

    }
    async getBinary(urlBinary) {
        const url = `${urlBinary}`;
        const options = {
            url,
            method: 'GET',
            headers: {
                Authorization: ''
            }
        };
        const [status, body] = await handleHttpRequest(options);
        if (status >= 200 && status <= 300) {
            return JSON.parse(body);
        }
    }
}
/**
 * IPS
 *
 * # Autenticacion
 *  - [OK] Generar token
 *  - [OK] Login
 *  - [OK] Verificar token
 *
 * # Profesional
 *  - [OK] Login
 *  - Consulta si el paciente esta federado:
 *      - NO: federa el paciente y guarda el id en identifier
 *      - SI: nada
 *  - [OK] Consulta dominios
 *  - [OK]Consulta DocumentReference
 *  - [OK]Descarga archivo Binary
 *  - Visualización
 *
 *  # BUS DE INTEROPERABILIDAD
 *   - Consulta DocumentReference por paciente
 *   - Responder con un IPS Generado
 */
