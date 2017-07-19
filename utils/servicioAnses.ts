

import { matching } from '@andes/match';
let soap = require('soap');
let url = 'http://192.168.20.63:8080/scripts/Autenticacion.exe/wsdl/IAutenticacion';
let serv = 'http://192.168.20.64:8080/scripts/autorizacion.exe/wsdl/IAutorizacion';
let serv2 = 'http://192.168.20.63:8080/scripts/Autenticacion.exe/wsdl/IAutenticacion';
let usuario = 'Sistemas_Andes_Salud';

let argsNumero = {
    Usuario: 'Sistemas_Andes_Salud',
    Password: 'spvB0452'
};

export function getServicioAnses(paciente) {
    // if (paciente && paciente.documento) {
    soap.createClient(url, function (err, client) {
        if (err) {
            return console.log('Error en creacion cliente soap anses', err);
        }
        // console.log('Cliente: ', client);
        client.LoginPecas(argsNumero, async function (err2, result) {
            if (err2) {
                return console.log('Error LoginPecas servicioAnses : ', err2);
            }
            // console.log(result);
            let filtro = '20358643788';
            let tipoConsulta = 'Cuil';
            // let filtro = 'paciente.documento';
            // let tipoConsulta = 'Documento';
            if (paciente.cuil && paciente.cuil.lenght > 10) {
                tipoConsulta = 'Cuil';
                filtro = paciente.cuil;
            }
            let resultado: any = await consultaAnses(result, tipoConsulta, filtro);

            if (resultado.codigo === 0 && resultado.array) {
                let pacienteAnses = {
                    nombreCompleto: resultado.array[0],
                    documento: resultado.array[1],
                    fechaNacimiento: resultado.array[2],
                    sexo: resultado.array[3]
                };
                return ({ 'paciente': paciente, 'matcheos': { 'entidad': 'Sintys', 'matcheo': 0, 'datosPaciente': pacienteAnses } });
            } else {
                return ({ 'paciente': paciente, 'matcheos': { 'entidad': 'Sintys', 'matcheo': 0, 'datosPaciente': {} } });
            }
            //TODO APLICAR matchAndes

        });
    });
    // }
}

function consultaAnses(sesion, tipo, filtro) {
    return new Promise((resolve, reject) => {
        // console.log('sesion: ', sesion.return['$value']);
        soap.createClient(serv2, function (err, client) {
            let args = {
                IdSesion: sesion.return['$value'],
                Base: 'PecasAutorizacion'
            };

            client.FijarBaseDeSesion(args, async function (err2, result) {
                if (err2) {
                    console.log('Error en fijarBaseSesion servicioAnses : ', err2);
                    reject(err2);
                }
                try {
                    let resultado: any = await solicitarServicio(sesion, tipo, filtro);
                    // console.log('...volviendo de la 1er solicitud');

                    if (tipo === 'Documento' && resultado.codigo === 0) {
                        // console.log('solicitando servicio nuevamente');
                        let resultadoCuil = await solicitarServicio(sesion, 'Cuil', resultado.array[1]);
                        console.log('resultadoCuil: ', JSON.stringify(resultadoCuil));
                        resolve(resultadoCuil);
                    } else {
                        console.log('resultado: ', JSON.stringify(resultado));
                        resolve(resultado);
                    }
                } catch (error) {
                    console.error('Error consulta soap anses:' + error);
                    reject(error);
                }
            });
        });
    });
}

function solicitarServicio(sesion, tipo, filtro) {
    return new Promise((resolve, reject) => {
        soap.createClient(serv, function (err3, client2) {
            if (err3) {
                console.log('Error creando cliente2 servicioAnses : ', err3);
                reject(err3);
            }
            let args2 = {
                IdSesionPecas: sesion.return['$value'],
                Cliente: 'ANDES SISTEMA',
                Proveedor: 'GN-ANSES',
                Servicio: tipo,
                DatoAuditado: filtro,
                Operador: usuario,
                Cuerpo: 'hola',
                CuerpoFirmado: false,
                CuerpoEncriptado: false
            };
            if (client2) {
                client2.Solicitar_Servicio(args2, function (err4, result2) {
                    if (err4) {
                        console.log('Error solicitar_servicio servicioAnses : ', err4);
                        reject(err4);
                    }
                    console.log('RESULTADO ------------------->', result2);
                    // console.log(JSON.stringify(result2.return.Resultado['$value']));
                    // console.log(Buffer.from(result2.return.Resultado['$value'], 'base64').toString('ascii'));
                    let codigoResultado = result2.return.CodResultado['$value'];
                    if (result2.return.Resultado['$value']) {
                        let resultado = Buffer.from(result2.return.Resultado['$value'], 'base64').toString('ascii');
                        let resArray = resultado.split(';');
                        resolve({ codigo: codigoResultado, array: resArray });
                    } else {
                        resolve({ codigo: codigoResultado, array: [] });
                    }
                });
            } else {
                reject('Error en el cliente2 servicioAnses');
            }
        });
    });
}
