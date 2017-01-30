import * as express from 'express'

var router = express.Router();

var soap = require('soap');
var libxmljs = require("libxmljs");

// var url = 'http://localhost/prueba_ws/GetNombre.asmx?WSDL';


var urlOperador = 'http://192.168.20.119:8080/Carrier/carrier?wsdl'
var urlNumero = 'http://192.168.20.119:8080/MobileOutBackup/MobileOut?wsdl';

router.get('/sms/:telefono', function (req, res, next) {
    // let args = { numero: req.params.telefono }

    var argsOperador = { telefono: req.params.telefono };
    // console.log("teléfono: ", argsOperador);

    let opciones = {
        ignoredNamespaces: {
            namespaces: ['ws'],
            override: true
        }
    }

    var argsNumero = {};

    soap.createClient(urlOperador, opciones, function (err, client) {
        client.recuperarOperador(argsOperador, function (err, result, raw) {

            var xml = result.return;

            var xmlDoc = libxmljs.parseXml(xml);

            var xmlDato = xmlDoc.get('//dato');

            let carrier = operador(xmlDato.text());

            argsNumero = {
                destino: req.params.telefono,
                mensaje: 'Mensaje desde Node, el turno fue cancelado!!!',
                operador: carrier,
                aplicacion: '',
                mobilein: '1'
            }

            soap.createClient(urlNumero, opciones, function (err, client) {
                client.envioSMSOperador(argsNumero, function (err, result, raw) {

                    console.log(result);
                })
            });
        })
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