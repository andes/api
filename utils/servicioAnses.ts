

let soap = require('soap');
let url = 'http://192.168.20.63:8080/scripts/Autenticacion.exe/wsdl/IAutenticacion';
let user = 'Sistemas_Andes_Salud';
let pass = 'spvB0452';


let argsNumero = {
    Usuario: 'Sistemas_Andes_Salud',
    Password: 'spvB0452'
};


export function getServicioAnses() {
    soap.createClient(url, function (err, client) {
        // console.log('Cliente: ', client);
        client.LoginPecas(argsNumero, function (err2, result) {
            if (err2) {
                console.log('Error 2 : ', err2);
            }
            console.log(result);
            let filtro = '35864378';
            solicitarServicio(result, 'Documento', filtro);
        });
    });
}

function solicitarServicio(sesion, tipo, filtro) {
    let usuario = 'Sistemas_Andes_Salud';
    let serv = 'http://192.168.20.64:8080/scripts/autorizacion.exe/wsdl/IAutorizacion';
    let serv2 = 'http://192.168.20.63:8080/scripts/Autenticacion.exe/wsdl/IAutenticacion';
    console.log('sesion: ', sesion.return['$value']);
    let args = {
        IdSesion: sesion.return['$value'],
        Base: 'PecasAutorizacion'
    };

    soap.createClient(serv2, function (err, client) {
        client.FijarBaseDeSesion(args, function (err2, result) {
            if (err2) {
                console.log('Error 2 : ', err2);
            }
            console.log(JSON.stringify(result));
            soap.createClient(serv, function (err3, client2) {
                if (err3) {
                    console.log('Error 2 : ', err3);
                }

                let args2 = {
                    IdSesionPecas: sesion.return['$value'],
                    Cliente: 'ANDES SISTEMA',
                    Proveedor: 'GN-ANSES',
                    Servicio: 'Documento',
                    DatoAuditado: filtro,
                    Operador: usuario,
                    Cuerpo: 'hola',
                    CuerpoFirmado: false,
                    CuerpoEncriptado: false
                };

                client2.Solicitar_Servicio(args2, function (err4, result2) {
                    if (err4) {
                        console.log('Error 2 : ', err4);
                    }
                    console.log(JSON.stringify(result2));
                });
            });
        });
    });
}
