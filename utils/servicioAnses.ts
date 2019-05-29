import * as config from '../config';
import * as configPrivate from '../config.private';
import { Matching } from '@andes/match';

const soap = require('soap');
const url = configPrivate.anses.url;
const serv = configPrivate.anses.serv;
const serv2 = configPrivate.anses.serv2;
let datosAnses = [];
const login = configPrivate.anses;

/**
 * @deprecated
 */

export function getServicioAnses(paciente) {
    const match = new Matching();
    const weights = config.mpi.weightsFaAnses;
    let matchPorcentaje = 0;
    let resultado: any;
    let fecha: any;
    return new Promise((resolve, reject) => {
        const band = (paciente.entidadesValidadoras) ? (paciente.entidadesValidadoras.indexOf('anses') < 0) : true;
        if (paciente && paciente.documento && band) {
            soap.createClient(url, (err, client) => {
                if (err) {
                    return reject(err);
                }
                if (client) {
                    let pacAndes: any;
                    client.LoginPecas(login, async (err2, result) => {
                        if (err2) {
                            reject(err2);
                        }
                        let tipoConsulta = 'Documento';
                        let filtro = paciente.documento;
                        if (paciente.cuil && paciente.cuil.lenght > 0) {
                            tipoConsulta = 'Cuil';
                            filtro = paciente.cuil;
                        }
                        pacAndes = { // Este objeto se arma así exclusivamente para comparar con anses
                            nombre: paciente.apellido + ' ' + paciente.nombre,
                            apellido: '',
                            sexo: paciente.sexo,
                            fechaNacimiento: paciente.fechaNacimiento,
                            documento: paciente.documento
                        };
                        try {
                            resultado = await consultaAnses(result, tipoConsulta, filtro);
                        } catch (error) {
                            reject(error);
                        }
                        const registro = resultado[1] ? resultado[1].datos : null;
                        const registrosAdicionales = resultado[2] ? resultado[2].adicionales : null;
                        if (resultado[0].codigo === 0 && registro) {
                            if (registro[2]) {
                                fecha = new Date(registro[2].substring(4), registro[2].substring(3, 5) - 1, registro[2].substring(0, 2));
                            } else {
                                fecha = '';
                            }
                            let sex = '';

                            if (registrosAdicionales) {
                                if (registrosAdicionales[0].sexo) {
                                    (registrosAdicionales[0].sexo === 'M') ? sex = 'masculino' : sex = 'femenino';
                                }
                            }
                            const pacienteAnses = {
                                nombre: registro[0],
                                apellido: '',
                                cuil: registro[1],
                                documento: registro[1].substring(2, 10), // Obtengo el documento para usar en el matching como substring del cuil
                                fechaNacimiento: fecha,
                                sexo: sex
                            };
                            try {
                                matchPorcentaje = await match.matchPersonas(pacAndes, pacienteAnses, weights, 'Levenshtein') * 100;
                            } catch (error) {
                                reject(error);
                            }
                            if (matchPorcentaje >= 85) {
                                // La idea de este registro es usar sólo el cuil
                                resolve({ cuil: pacienteAnses.cuil });
                                // resolve({'entidad': 'Anses', 'matcheo': matchPorcentaje, 'pacienteConsultado': paciente, 'pacienteAnses': pacienteAnses });
                            } else {
                                resolve('Matcheo insuficiente: ' + matchPorcentaje);
                            }
                        } else {
                            // No interesa devolver los datos básicos
                            resolve(null);
                        }
                    });
                } else {
                    resolve(null);
                }
            });
        } else {
            resolve({ paciente, matcheos: { entidad: 'Anses', matcheo: 0, datosPaciente: {} } });
        }
    });
}

function consultaAnses(sesion, tipo, filtro) {
    let resultadoCuil: any;
    let rst: any;
    datosAnses = [];
    return new Promise((resolve, reject) => {
        soap.createClient(serv2, (err, client) => {
            const args = {
                IdSesion: sesion.return['$value'],
                Base: 'PecasAutorizacion'
            };
            client.FijarBaseDeSesion(args, async (err2, result) => {
                if (err2) {
                    reject(err2);
                }
                try {
                    rst = await solicitarServicio(sesion, tipo, filtro);
                    datosAnses.push({ codigo: rst.codigo });
                    datosAnses.push({ datos: rst.array });
                } catch (error) {
                    reject(error);
                }
                if (tipo === 'Documento' && rst.codigo === 0) {
                    try {
                        resultadoCuil = await solicitarServicio(sesion, 'Cuil', rst.array[1]);
                        const datosAdicionales = [{ sexo: resultadoCuil.array[3] }, { Localidad: resultadoCuil.array[5] }, { Calle: resultadoCuil.array[6] }, { altura: resultadoCuil.array[7] }];
                        datosAnses.push({ adicionales: datosAdicionales });
                    } catch (error) {
                        reject(error);
                    }
                    resolve(datosAnses);
                } else {
                    resolve(datosAnses);
                }
            });
        });
    });
}

function solicitarServicio(sesion, tipo, filtro) {
    return new Promise((resolve, reject) => {
        soap.createClient(serv, (err3, client2) => {
            if (err3) {
                reject(err3);
            }
            const args2 = {
                IdSesionPecas: sesion.return['$value'],
                Cliente: 'ANDES SISTEMA',
                Proveedor: 'GN-ANSES',
                Servicio: tipo,
                DatoAuditado: filtro,
                Operador: login.Usuario,
                Cuerpo: 'hola',
                CuerpoFirmado: false,
                CuerpoEncriptado: false
            };
            if (client2) {
                client2.Solicitar_Servicio(args2, (err4, result2) => {
                    if (err4) {
                        reject(err4);
                    }
                    const codigoResultado = result2.return.CodResultado['$value'];
                    if (result2.return.Resultado['$value']) {
                        const resultado = Buffer.from(result2.return.Resultado['$value'], 'base64').toString('ascii');
                        const resArray = resultado.split(';');
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
