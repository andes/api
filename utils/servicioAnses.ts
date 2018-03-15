import * as config from '../config';
import * as configPrivate from '../config.private';
import { Matching } from '@andes/match';
import * as moment from 'moment';

let soap = require('soap');
let url = configPrivate.anses.url;
let serv = configPrivate.anses.serv;
let serv2 = configPrivate.anses.serv2;
let datosAnses = [];
let login = configPrivate.anses;

export function getServicioAnses(paciente) {
    let match = new Matching();
    let weights = config.mpi.weightsFaAnses;
    let matchPorcentaje = 0;
    let resultado: any;
    let fecha: any;
    return new Promise((resolve, reject) => {
        let band = (paciente.entidadesValidadoras) ? (paciente.entidadesValidadoras.indexOf('anses') < 0) : true;
        if (paciente && paciente.documento && band) {
            soap.createClient(url, function (err, client) {
                if (err) {
                    reject(err);
                }
                if (client) {
                    client.LoginPecas(login, async function (err2, result) {
                        if (err2) {
                            reject(err2);
                        }
                        let tipoConsulta = 'Documento';
                        let filtro = paciente.documento;
                        if (paciente.cuil && paciente.cuil.lenght > 0) {
                            tipoConsulta = 'Cuil';
                            filtro = paciente.cuil;
                        }
                        if (paciente.nombre && paciente.apellido) {
                            paciente.nombre = paciente.apellido + ' ' + paciente.nombre;
                            paciente.apellido = '';
                        }
                        try {
                            resultado = await consultaAnses(result, tipoConsulta, filtro);
                        } catch (error) {
                            reject(error);
                        }
                        let registro = resultado[1] ? resultado[1].datos : null;
                        let registrosAdicionales = resultado[2] ? resultado[2].adicionales : null;
                        if (resultado[0].codigo === 0 && registro) {
                            if (registro[2]) {
                                fecha = new Date(registro[2].substring(4), registro[2].substring(3, 5) - 1, registro[2].substring(0, 2));
                            } else {
                                fecha = '';
                            }
                            let acreditado = registro[3];
                            let sex = '';

                            if (registrosAdicionales) {
                                if (registrosAdicionales[0].sexo) {
                                    (registrosAdicionales[0].sexo === 'M') ? sex = 'masculino' : sex = 'femenino';
                                }
                            }
                            let pacienteAnses = {
                                nombre: registro[0],
                                apellido: '',
                                cuil: registro[1],
                                documento: registro[1].substring(2, 10), // Obtengo el documento para usar en el matching como substring del cuil
                                fechaNacimiento: fecha,
                                sexo: sex
                            };
                            try {
                                matchPorcentaje = await match.matchPersonas(paciente, pacienteAnses, weights, 'Levenshtein') * 100;
                            } catch (error) {
                                reject(error);
                            }
                            if (matchPorcentaje >= 85) {
                                // La idea de este registro es usar sólo el cuil
                                resolve({ 'cuil': pacienteAnses.cuil });
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
            resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Anses', 'matcheo': 0, 'datosPaciente': {} } });
        }
    });
}

function consultaAnses(sesion, tipo, filtro) {
    let resultadoCuil: any;
    let rst: any;
    datosAnses = [];
    return new Promise((resolve, reject) => {
        soap.createClient(serv2, function (err, client) {
            let args = {
                IdSesion: sesion.return['$value'],
                Base: 'PecasAutorizacion'
            };
            client.FijarBaseDeSesion(args, async function (err2, result) {
                if (err2) {
                    reject(err2);
                }
                try {
                    rst = await solicitarServicio(sesion, tipo, filtro);
                    datosAnses.push({ 'codigo': rst.codigo });
                    datosAnses.push({ 'datos': rst.array });
                } catch (error) {
                    reject(error);
                }
                if (tipo === 'Documento' && rst.codigo === 0) {
                    try {
                        resultadoCuil = await solicitarServicio(sesion, 'Cuil', rst.array[1]);
                        let datosAdicionales = [{ 'sexo': resultadoCuil.array[3] }, { 'Localidad': resultadoCuil.array[5] }, { 'Calle': resultadoCuil.array[6] }, { 'altura': resultadoCuil.array[7] }];
                        datosAnses.push({ 'adicionales': datosAdicionales });
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
        soap.createClient(serv, function (err3, client2) {
            if (err3) {
                reject(err3);
            }
            let args2 = {
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
                client2.Solicitar_Servicio(args2, function (err4, result2) {
                    if (err4) {
                        reject(err4);
                    }
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
