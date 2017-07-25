let soap = require('soap');
let libxmljs = require('libxmljs');

// let url = 'sms.neuquen.gov.ar';
let url = '192.168.20.119';
let urlOperador = 'http://' + url + ':8080/Carrier/carrier?wsdl';
let urlNumero = 'http://' + url + ':8080/MobileOutBackup/MobileOut?wsdl';

// El mensaje puede ser el código de verificación, recordatorio de turno, etc.
export interface SmsOptions {
    telefono: number;
    mensaje: string;
}

export function sendSms(smsOptions: SmsOptions) {
    console.log('Enviando SMS...');

    let argsOperador = {
        telefono: smsOptions.telefono
    };

    let opciones = {
        ignoredNamespaces: {
            namespaces: ['ws'],
            override: true
        }
    };

    let argsNumero = {};

    soap.createClient(urlOperador, opciones, function (err, client) {
        if (err) {
            console.log(err);
            console.log('No ha sido posible enviar el sms');
        } else {
            if (client) {
                client.recuperarOperador(argsOperador, function (err, result, raw) {
                    // Server down?
                    if (client.lastResponse) {
                        let xmlFault = libxmljs.parseXml(client.lastResponse);
                        let xmlFaultString = xmlFault.get('//faultstring');
                        // Escupir el error que viene en la respuesta XML del servidor
                        if (xmlFaultString) {
                            return console.log(xmlFaultString.text()); // ptú ptú
                        }
                    }
                    if (result && result.return) {

                        let xml = result.return;
                        let xmlDoc = libxmljs.parseXml(xml);
                        let xmlDato = xmlDoc.get('//dato');
                        let carrier = operador(xmlDato.text());

                        if (carrier) {
                            argsNumero = {
                                destino: argsOperador.telefono,
                                mensaje: smsOptions.mensaje,
                                operador: carrier,
                                aplicacion: '',
                                mobilein: '1'
                            };

                            soap.createClient(urlNumero, opciones, function (err, client) {
                                client.envioSMSOperador(argsNumero, function (err2, result, raw) {

                                    let xml = result.return;
                                    let xmlDoc = libxmljs.parseXml(xml);
                                    let xmlDato = xmlDoc.get('//status');
                                    let status = xmlDato.text();
                                    if (err2) {
                                        return console.log(err2);
                                    } else {
                                        return console.log(status);
                                    }
                                });
                            });
                        } else {
                            return console.log('No se ha podido reconocer el operador');
                        }
                    }
                });
            } else {
                return console.log('No es posible conectarse al servidor de envio de mensajes');
            }
        }
    });

    function operador(operador) {
        let idOperador = '';

        switch (operador) {
            case 'MOVISTAR': idOperador = '1';
                break;
            case 'CLARO': idOperador = '3';
                break;
            case 'PERSONAL': idOperador = '4';
                break;
            default: idOperador = 'No existe operador';
        }
        return idOperador;
    }
}