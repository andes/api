import { SMSendpoints } from '../../config.private';
import * as debug from 'debug';

let log = debug('sendSMS');
let soap = require('soap');
let libxmljs = require('libxmljs');

export interface SmsOptions {
    telefono: number;
    mensaje: string;
}

export function sendSms(smsOptions: SmsOptions) {
    return new Promise((resolve, reject) => {
        log('Enviando SMS a ', smsOptions.telefono);
        let argsOperador = {
            telefono: smsOptions.telefono
        };
        let argsNumero = {};
        createClient(SMSendpoints.urlOperador).then((clientOperador: any) => {
            clientOperador.recuperarOperador(argsOperador, function (errOperador, result, raw) {
                // Server down?
                if (clientOperador.lastResponse) {
                    try {
                        let xmlFaultString = getXMLOption(clientOperador.lastResponse, '//faultstring');
                        if (xmlFaultString) {
                            return reject(xmlFaultString);
                        }
                    } catch (e) {
                        // return reject(e);
                    }
                }
                if (result && result.return) {
                    let carrier;
                    try {
                        let xmlDato = getXMLOption(result.return, '//dato');
                        carrier = operador(xmlDato);
                    } catch (ee) {
                        return reject(ee);
                    }

                    if (carrier) {
                        argsNumero = {
                            destino: argsOperador.telefono,
                            mensaje: smsOptions.mensaje,
                            operador: carrier,
                            aplicacion: '',
                            mobilein: '1'
                        };

                        createClient(SMSendpoints.urlNumero).then((clientEnvio: any) => {
                            clientEnvio.envioSMSOperador(argsNumero, function (errEnvio, resultEnvio, _raw) {
                                try {
                                    if (errEnvio) {
                                        return reject(errEnvio);
                                    } else {
                                        let status = getXMLOption(resultEnvio.return, '//status');
                                        return status === '0' ? resolve(status) : reject(status);
                                    }
                                } catch (eee) {
                                    return reject(eee);
                                }
                            });
                        });
                    } else {
                        return reject('No se ha podido reconocer el operador');
                    }
                }
            });
        });

    });
}

function operador(operadorName) {
    let idOperador = '';

    switch (operadorName) {
        case 'MOVISTAR':
            idOperador = '1';
            break;
        case 'CLARO':
            idOperador = '3';
            break;
        case 'PERSONAL':
            idOperador = '4';
            break;
        default:
            idOperador = 'No existe operador';
            break;
    }
    return idOperador;
}

function getXMLOption(xml, option) {
    let xmlDocument = libxmljs.parseXml(xml);
    let xmlData = xmlDocument.get(option);
    return xmlData.text();
}

function createClient(url) {
    return new Promise((resolve, reject) => {

        let opciones = {
            ignoredNamespaces: {
                namespaces: ['ws'],
                override: true
            }
        };

        soap.createClient(url, opciones, function (errCreate, client) {
            if (errCreate) {
                reject(errCreate);
            } else {
                if (client) {
                    resolve(client);
                } else {
                    reject('no se pudo create el cliente SOAP');
                }
            }
        });
    });
}
