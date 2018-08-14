import * as configPrivate from '../config.private';

let soap = require('soap');
let url = configPrivate.renaper.url;
let serv = configPrivate.renaper.serv;
let login = configPrivate.renaper;

export function getServicioRenaper(paciente) {
    let resultado: any;
    return new Promise((resolve, reject) => {
        if (paciente) {
            soap.createClient(url, (err, client) => {
                if (err) {
                    return reject(err);
                }
                if (client) {
                    if (paciente.documento && paciente.sexo) {
                        client.LoginPecas(login, async (err2, result) => {
                            if (err2) {
                                reject(err2);
                            }
                            let tipoConsulta = 'WS_RENAPER_documento';
                            let filtro = 'documento=' + paciente.documento + ';sexo=' + paciente.sexo;
                            try {
                                resultado = await consultaRenaper(result, tipoConsulta, filtro);
                            } catch (error) {
                                reject(error);
                            }
                            resolve(resultado);
                        });
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        } else {
            resolve({ paciente, matcheos: { entidad: 'Renaper', matcheo: 0, datosPaciente: {} } });
        }
    });
}

function consultaRenaper(sesion, tipo, filtro) {
    let rst: any;
    return new Promise((resolve, reject) => {
        if (sesion.return) {
            soap.createClient(url, (_err, client) => {
                let args = {
                    IdSesion: sesion.return['$value'],
                    Base: 'PecasAutorizacion'
                };
                client.FijarBaseDeSesion(args, async (err2, _result) => {
                    if (err2) {
                        reject(err2);
                    }
                    try {
                        rst = await solicitarServicio(sesion, tipo, filtro);
                    } catch (error) {
                        reject(error);
                    }
                    resolve(rst);
                });
            });
        } else {
            // Para el caso que falle la creación de la sesión con Pecas por servicio no disponible
            reject(null);
        }
    });
}

function solicitarServicio(sesion, tipo, filtro) {
    return new Promise((resolve, reject) => {
        soap.createClient(serv, (err3, client2) => {
            if (err3) {
                reject(err3);
            }
            let args2 = {
                IdSesionPecas: sesion.return['$value'],
                Cliente: 'ANDES SISTEMA',
                Proveedor: 'GP-RENAPER',
                Servicio: tipo,
                DatoAuditado: filtro,
                Operador: login.Usuario,
                Cuerpo: 'hola',
                Firma: false,
                CuerpoFirmado: false,
                CuerpoEncriptado: false
            };
            if (client2) {
                client2.Solicitar_Servicio(args2, (err4, result2) => {
                    if (err4) {
                        reject(err4);
                    }
                    let codigoResultado = result2.return.CodResultado['$value'];
                    if (result2.return.Resultado['$value']) {
                        let resultado = Buffer.from(result2.return.Resultado['$value'], 'base64').toString('ascii');
                        // convertimos a JSON el resultado
                        let resArray = JSON.parse(resultado);
                        resolve({ codigo: codigoResultado, datos: resArray });
                    } else {
                        resolve({ codigo: codigoResultado, datos: [] });
                    }
                });
            } else {
                reject('Error en el cliente2 servicio ReNaPer');
            }
        });
    });
}
