import { Matching } from '@andes/match';
import * as https from 'https';
import * as config from '../config';
import * as configPrivate from '../config.private';
// Services
// import { Logger } from '../utils/logService';
let to_json = require('xmljson').to_json;


export function getSisaCiudadano(nroDocumento, usuario, clave, sexo?: string) {
    /**
     * Capítulo 5.2.2 - Ficha del ciudadano
     * Se obtienen los datos desde Sisa
     * Ejemplo de llamada https://sisa.msal.gov.ar/sisa/services/rest/cmdb/obtener?nrodoc=26334344&usuario=user&clave=pass
     * Información de Campos https://sisa.msal.gov.ar/sisa/sisadoc/index.jsp?id=cmdb_ws_042
     */
    // options for GET
    let xml = '';
    let pathSisa = configPrivate.sisa.url + 'nrodoc=' + nroDocumento + '&usuario=' + usuario + '&clave=' + clave;

    if (sexo) {
        pathSisa = configPrivate.sisa.url + 'nrodoc=' + nroDocumento + '&sexo=' + sexo + '&usuario=' + usuario + '&clave=' + clave;
    }

    let optionsgetmsg = {
        host: configPrivate.sisa.host,
        port: configPrivate.sisa.port,
        path: pathSisa,
        method: 'GET', // do GET,
        rejectUnauthorized: false,
    };

    // Realizar GET request
    return new Promise((resolve, reject) => {
        let reqGet = https.request(optionsgetmsg, function (res) {
            res.on('data', function (d) {
                // console.info('GET de Sisa ' + nroDocumento + ':\n');
                if (d.toString()) {
                    xml = xml + d.toString();
                }
            });

            res.on('end', function () {

                if (xml) {
                    // Se parsea el xml obtenido a JSON
                    to_json(xml, function (error, data) {
                        if (error) {
                            resolve([500, {}]);
                        } else {
                            // console.log(data);
                            resolve([res.statusCode, data]);
                        }
                    });
                } else {
                    resolve([res.statusCode, {}]);
                }
            });

        });
        reqGet.end();
        reqGet.on('error', function (e) {
            reject(e);
        });

    });
}

export function formatearDatosSisa(datosSisa) {
    let ciudadano;
    let fecha;
    ciudadano = new Object();
    if (datosSisa.nroDocumento) {
        ciudadano.documento = datosSisa.nroDocumento;
    }
    if (datosSisa.nombre) {
        ciudadano.nombre = datosSisa.nombre;
    }
    if (datosSisa.apellido) {
        ciudadano.apellido = datosSisa.apellido;
    }
    // Se arma un objeto de dirección
    ciudadano.direccion = [];
    let domicilio;
    domicilio = new Object();
    if (datosSisa.domicilio) {
        if (datosSisa.pisoDpto && datosSisa.pisoDpto !== '0 0') {
            domicilio.valor = datosSisa.domicilio + ' ' + datosSisa.pisoDpto;
        }
        domicilio.valor = datosSisa.domicilio;
    }

    if (datosSisa.codigoPostal) {
        domicilio.codigoPostal = datosSisa.codigoPostal;
    }
    let ubicacion;
    ubicacion = new Object();
    ubicacion.localidad = new Object();
    ubicacion.provincia = new Object();
    if (datosSisa.localidad) {
        ubicacion.localidad.nombre = datosSisa.localidad;
    }

    if (datosSisa.provincia) {
        ubicacion.provincia.nombre = datosSisa.provincia;
    }

    // Ver el pais de la ubicación
    domicilio.ranking = 1;
    domicilio.activo = true;
    domicilio.ubicacion = ubicacion;
    ciudadano.direccion.push(domicilio);

    if (datosSisa.sexo) {
        if (datosSisa.sexo === 'F') {
            ciudadano.sexo = 'femenino';
            ciudadano.genero = 'femenino';
        } else {
            ciudadano.sexo = 'masculino';
            ciudadano.genero = 'masculino';

        }
    }
    if (datosSisa.fechaNacimiento) {
        fecha = datosSisa.fechaNacimiento.split('-');
        let fechaNac = new Date(fecha[2].substr(0, 4), fecha[1] - 1, fecha[0]);
        ciudadano.fechaNacimiento = fechaNac.toJSON();
    }

    // if (datosSisa.estadoCivil) {
    // estadoCivil: {
    //     type: String,
    //     enum: ['casado', 'separado', 'divorciado', 'viudo', 'soltero', 'otro', '']
    // }
    // }

    if (datosSisa.fallecido !== 'NO') {
        if (datosSisa.fechaFallecimiento) {
            fecha = datosSisa.fechaFallecimiento.split('-');
            let fechaFac = new Date(fecha[2].substr(0, 4), fecha[1], fecha[0]);
            ciudadano.fechaFallecimiento = fechaFac.toJSON();
        }
    }
    return ciudadano;
}


export function getPacienteSisa(nroDocumento, sexo?: string) {
    return new Promise((resolve, reject) => {
        this.getSisaCiudadano(nroDocumento, configPrivate.sisa.username, configPrivate.sisa.password)
            .then((resultado) => {
                if (resultado) {
                    let dato = this.formatearDatosSisa(resultado[1].Ciudadano);
                    resolve(dato);
                }
                resolve(null);
            })
            .catch((err) => {
                reject(err);
            });
    });
}


export function matchSisa(paciente) {
    // console.log("PACIENTE EN MATCHSISA----------->",paciente);
    // Verifica si el paciente tiene un documento valido y realiza la búsqueda a través de Sisa
    let matchPorcentaje = 0;
    let pacienteSisa = {};
    let weights = config.mpi.weightsDefault;
    let match = new Matching();
    paciente['matchSisa'] = 0;
    // Se buscan los datos en sisa y se obtiene el paciente
    return new Promise((resolve, reject) => {
        let band = (paciente.entidadesValidadoras) ? (paciente.entidadesValidadoras.indexOf('sisa') < 0) : true;
        if (paciente.documento && band) {
            if (paciente.documento.length >= 7) {
                let sexo = null;
                if (paciente.sexo) {
                    sexo = (paciente.sexo === 'femenino') ? 'F' : 'M';
                }
                // OJO: Es sólo para pacientes con SEXO debido a que pueden existir distintos pacientes con el mismo DNI
                getSisaCiudadano(paciente.documento, configPrivate.sisa.username, configPrivate.sisa.password, sexo)
                    .then((resultado) => {
                        if (resultado) {
                            // Verifico el resultado devuelto por el rest de Sisa
                            if (resultado[0] === 200) {
                                switch (resultado[1].Ciudadano.resultado) {
                                    case 'OK':
                                        if (resultado[1].Ciudadano.identificadoRenaper && resultado[1].Ciudadano.identificadoRenaper !== 'NULL') {
                                            pacienteSisa = formatearDatosSisa(resultado[1].Ciudadano);
                                            matchPorcentaje = match.matchPersonas(paciente, pacienteSisa, weights, 'Levenshtein');
                                            matchPorcentaje = (matchPorcentaje * 100);
                                            // TODO
                                            // Logger.log(req, 'auditoria', 'busqueda:sisa', {
                                            //     resultado: resultado
                                            // });
                                            resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Sisa', 'matcheo': matchPorcentaje, 'datosPaciente': pacienteSisa } });
                                        } else {
                                            resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Sisa', 'matcheo': 0, 'datosPaciente': null } });
                                        }
                                        break;
                                    default:
                                        resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Sisa', 'matcheo': 0, 'datosPaciente': null } });
                                        break;
                                }


                            }

                        }
                        resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Sisa', 'matcheo': 0, 'datosPaciente': null } });


                    })
                    .catch((err) => {
                        reject(err);
                    });

            } else {
                resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Sisa', 'matcheo': 0, 'datosPaciente': null } });
            }
        } else {
            resolve({ 'paciente': paciente, 'matcheos': { 'entidad': 'Sisa', 'matcheo': 0, 'datosPaciente': null } });
        }
    });
}
