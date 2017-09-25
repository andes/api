import * as config from '../config';
import * as configPrivate from '../config.private';
import { Matching } from '@andes/match';
let soap = require('soap');
let url = 'http://192.168.20.63:8080/scripts/Autenticacion.exe/wsdl/IAutenticacion';
let serv = 'http://192.168.20.64:8080/scripts/autorizacion.exe/wsdl/IAutorizacion';
let serv2 = 'http://192.168.20.63:8080/scripts/Autenticacion.exe/wsdl/IAutenticacion';

let login = configPrivate.anses;

export function getServicioAnses(paciente) {
    let match = new Matching();
    let weights = config.mpi.weightsDefault;
    let matchPorcentaje = 0;
    let resultado: any;
    let fecha: any;
    return new Promise((resolve, reject) => {
        let band = (paciente.entidadesValidadoras) ? (paciente.entidadesValidadoras.indexOf('anses') < 0) : true;
        if (paciente && paciente.documento && band) {
            soap.createClient(url, function (err, client) {
                if (err) {
                    console.log('Error en creacion cliente soap anses', err);
                    reject(err);
                }
                client.LoginPecas(login, async function (err2, result) {
                    if (err2) {
                        console.log('Error LoginPecas servicioAnses : ', err2);
                        reject(err2);
                    }
                    let tipoConsulta = 'Documento';
                    let filtro = paciente.documento;
                    if (paciente.cuil && paciente.cuil.lenght > 10) {
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
                        console.error('Error matchPersonas servicioAnses:' + error);
                        reject(error);
                    }
                    if (resultado.codigo === 0 && resultado.array) {
                        if (resultado.array[2]) {
                            fecha = new Date(resultado.array[2].substring(4), resultado.array[2].substring(3, 4) - 1, resultado.array[2].substring(0, 2));
                        } else {
                            fecha = '';
                        }
                        let sex = '';
                        if (resultado.array[3]) {
                            (resultado.array[3] === 'M') ? sex = 'masculino' : sex = 'femenino';
                        }
                        let pacienteAnses = {
                            nombre: resultado.array[0],
                            apellido: '',
                            documento: resultado.array[1],
                            fechaNacimiento: fecha,
                            sexo: sex
                        };
                        try {
                            matchPorcentaje = await match.matchPersonas(paciente, pacienteAnses, weights, 'Levenshtein') * 100;
                        } catch (error) {
                            console.error('Error matchPersonas servicioAnses:' + error);
                            reject(error);
                        }
                        console.log('el % de matcheo es:', matchPorcentaje);
                        resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Anses', 'matcheo': matchPorcentaje, 'datosPaciente': pacienteAnses } });
                    } else {
                        resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Anses', 'matcheo': 0, 'datosPaciente': {} } });
                    }
                });
            });
        } else {
            resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Anses', 'matcheo': 0, 'datosPaciente': {} } });
        }
    });
}

function consultaAnses(sesion, tipo, filtro) {
    let resultadoCuil: any;
    let resultado: any;
    return new Promise((resolve, reject) => {
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
                    resultado = await solicitarServicio(sesion, tipo, filtro);
                } catch (error) {
                    console.error('Error consulta soap anses:' + error);
                    reject(error);
                }
                if (tipo === 'Documento' && resultado.codigo === 0) {
                    try {
                        resultadoCuil = await solicitarServicio(sesion, 'Cuil', resultado.array[1]);
                    } catch (error) {
                        console.error('Error consulta soap anses:' + error);
                        reject(error);
                    }
                    resolve(resultadoCuil);
                } else {
                    console.log('resultado: ', JSON.stringify(resultado));
                    resolve(resultado);
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
                Operador: login.username,
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
