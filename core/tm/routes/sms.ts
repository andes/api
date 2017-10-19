import * as express from 'express';

let router = express.Router();
let soap = require('soap');
let libxmljs = require('libxmljs');

let url = 'sms.neuquen.gov.ar';
let urlOperador = 'http://' + url + ':8080/Carrier/carrier?wsdl';
let urlNumero = 'http://' + url + ':8080/MobileOutBackup/MobileOut?wsdl';

router.get('/sms', function (req, res, next) {

    let argsOperador = { telefono: req.query.telefono };
    let opciones = {
        ignoredNamespaces: {
            namespaces: ['ws'],
            override: true
        }
    };
    let argsNumero = {};
    soap.createClient(urlOperador, opciones, function (errCreate, client) {
        if (errCreate) {
            return next('No ha sido posible enviar el sms');
        } else {
            if (client) {
                client.recuperarOperador(argsOperador, function (err, result, raw) {
                    // Server down?
                    if (client.lastResponse) {
                        let xmlFault = libxmljs.parseXml(client.lastResponse);
                        let xmlFaultString = xmlFault.get('//faultstring');
                        // Escupir el error que viene en la respuesta XML del servidor
                        if (xmlFaultString) {
                            return next(xmlFaultString.text()); // ptú ptú
                        }
                    }
                    if (result && result.return) {
                        let xml = result.return;
                        let xmlDoc = libxmljs.parseXml(xml);
                        let xmlDato = xmlDoc.get('//dato');
                        let carrier = operador(xmlDato.text());
                        if (carrier) {
                            argsNumero = {
                                destino: req.query.telefono,
                                mensaje: req.query.mensaje,
                                operador: carrier,
                                aplicacion: '',
                                mobilein: '1'
                            };
                            soap.createClient(urlNumero, opciones, function (errCreate2, client2) {
                                client.envioSMSOperador(argsNumero, function (err2, result2) {
                                    let xml2 = result2.return;
                                    let xmlDoc2 = libxmljs.parseXml(xml2);
                                    let xmlDato2 = xmlDoc2.get('//status');
                                    let status = xmlDato2.text();
                                    if (err2) {
                                        return next(err2);
                                    } else {
                                        return res.json(status);
                                    }
                                });
                            });
                        } else {
                            return next('No se ha podido reconocer el operador');
                        }
                    }
                });
            } else {
                return next('No es posible conectarse al servidor de envio de mensajes');
            }
        }
    });

    function operador(nombre: string) {
        let idOperador = '';

        switch (nombre) {
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
});

export = router;
