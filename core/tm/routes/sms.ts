import * as express from 'express'

var router = express.Router();

var soap = require('soap');
var libxmljs = require("libxmljs");

var urlOperador = 'http://192.168.20.119:8080/Carrier/carrier?wsdl';
var urlNumero = 'http://192.168.20.119:8080/MobileOutBackup/MobileOut?wsdl';

// router.get('/sms/:telefono', function (req, res, next) {

//     let argsOperador = { 
//         telefono: req.params.telefono
//     };

//     let opciones = {
//         ignoredNamespaces: {
//             namespaces: ['ws'],
//             override: true
//         }
//     }

//     var argsNumero = {};

//     soap.createClient(urlOperador, opciones, function (err, client) {

//         if (err) {
//             return next('No ha sido posible enviar el sms');
//         } 

//         client.recuperarOperador(argsOperador, function (err, result, raw) {

//             // Server down?
//             if ( client.lastResponse ) {

//                 var xmlFault = libxmljs.parseXml(client.lastResponse);
//                 var xmlFaultString = xmlFault.get('//faultstring');
                
//                 // Escupir el error que viene en la respuesta XML del servidor
//                 if ( xmlFaultString ) {
//                     return next(xmlFaultString.text()); // ptú ptú
//                 }
//             }

//             var xml = result.return;
//             var xmlDoc = libxmljs.parseXml(xml);
//             var xmlDato = xmlDoc.get('//dato');

//             let carrier = operador(xmlDato.text());

//             argsNumero = {
//                 destino: req.params.telefono,
//                 mensaje: req.params.mensaje,
//                 operador: carrier,
//                 aplicacion: '',
//                 mobilein: '1'
//             }

//             soap.createClient(urlNumero, opciones, function (err, client) {
//                 client.envioSMSOperador(argsNumero, function (err, result, raw) {

//                     var xml = result.return;
//                     var xmlDoc = libxmljs.parseXml(xml);
//                     var xmlDato = xmlDoc.get('//status');
//                     let status = xmlDato.text();

//                     if (err)
//                         return next(err);
//                     else
//                         return res.json(status);
//                 }); // client.envioSMSOperador
//             }); // soap.createClient
//         }); // client.recuperarOperador
//     }); // soap.createClient

//     function operador(operador) {
//         let idOperador = '';

//         switch (operador) {
//             case 'MOVISTAR': idOperador = '1'
//                 break;
//             case 'CLARO': idOperador = '3'
//                 break;
//             case 'PERSONAL': idOperador = '4'
//                 break;
//             default: 'No existe operador';
//         }

//         return idOperador;
//     }
// });


router.get('/sms', function (req, res, next) {

    let argsOperador = { telefono: req.query.telefono };

    let opciones = {
        ignoredNamespaces: {
            namespaces: ['ws'],
            override: true
        }
    }

    let argsNumero = {};

    // console.log(req.query);

    soap.createClient(urlOperador, opciones, function (err, client) {
        if (err) {
            console.log(err);
            return next('No ha sido posible enviar el sms');
        } else {
            if (client) {
                client.recuperarOperador(argsOperador, function (err, result, raw) {

                    // Server down?
                    if ( client.lastResponse ) {
                        
                        var xmlFault = libxmljs.parseXml(client.lastResponse);
                        var xmlFaultString = xmlFault.get('//faultstring');
                        
                        // Escupir el error que viene en la respuesta XML del servidor
                        if ( xmlFaultString ) {
                            return next(xmlFaultString.text()); // ptú ptú
                        }
                    }

                    if ( result && result.return ) {

                        console.log(result.return);

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
                            }

                            soap.createClient(urlNumero, opciones, function (err, client) {

                                client.envioSMSOperador(argsNumero, function (err, result, raw) {

                                    console.log(result);

                                    let xml = result.return;
                                    let xmlDoc = libxmljs.parseXml(xml);
                                    let xmlDato = xmlDoc.get('//status');
                                    let status = xmlDato.text();

                                    if (err) {
                                        return next(err);
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

    function operador(operador) {
        let idOperador = '';

        switch (operador) {
            case 'MOVISTAR': idOperador = '1'
                break;
            case 'CLARO': idOperador = '3'
                break;
            case 'PERSONAL': idOperador = '4'
                break;
            default: 'No existe operador';
        }

        return idOperador;
    }
});


export = router;