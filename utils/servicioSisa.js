"use strict";
var validateFormatDate_1 = require('./validateFormatDate');
var machingDeterministico_1 = require('./machingDeterministico');
var https = require('https');
var config = require('./config');
var to_json = require('xmljson').to_json;
var servicioSisa = (function () {
    function servicioSisa() {
    }
    servicioSisa.prototype.matchPersonas = function (paciente, pacienteSisa) {
        var m3 = new machingDeterministico_1.machingDeterministico();
        var weights = {
            identity: 0.3,
            name: 0.3,
            gender: 0.1,
            birthDate: 0.3
        };
        var IPac = {
            identity: paciente.documento,
            firstname: paciente.nombre,
            lastname: paciente.apellido,
            birthDate: validateFormatDate_1.ValidateFormatDate.convertirFecha(paciente.fechaNacimiento),
            gender: paciente.sexo
        };
        var IPacSisa = {
            identity: pacienteSisa.documento,
            firstname: pacienteSisa.nombre,
            lastname: pacienteSisa.apellido,
            birthDate: validateFormatDate_1.ValidateFormatDate.convertirFecha(pacienteSisa.fechaNacimiento),
            gender: pacienteSisa.sexo
        };
        // console.log("Paciente Match: ",IPac,IPacSisa);
        var valorSisa = m3.maching(IPac, IPacSisa, weights);
        //console.log("Paciente Match: ",IPac,IPacSisa);
        // console.log("Match: ",valorSisa);
        return valorSisa;
    };
    servicioSisa.prototype.getSisaCiudadano = function (nroDocumento, usuario, clave, sexo) {
        /**
         * Capítulo 5.2.2 - Ficha del ciudadano
         * Se obtienen los datos desde Sisa
         * Ejemplo de llamada https://sisa.msal.gov.ar/sisa/services/rest/cmdb/obtener?nrodoc=26334344&usuario=user&clave=pass
         * Información de Campos https://sisa.msal.gov.ar/sisa/sisadoc/index.jsp?id=cmdb_ws_042
         */
        // options for GET
        //Agregar a la consulta el sexo para evitar el problema de dni repetidos
        var datosParseados;
        var xml = '';
        var organizacion = new Object();
        var pathSisa = '/sisa/services/rest/cmdb/obtener?nrodoc=' + nroDocumento + '&usuario=' + usuario + '&clave=' + clave;
        if (sexo) {
            pathSisa = '/sisa/services/rest/cmdb/obtener?nrodoc=' + nroDocumento + '&sexo=' + sexo + '&usuario=' + usuario + '&clave=' + clave;
        }
        var optionsgetmsg = {
            host: 'sisa.msal.gov.ar',
            port: 443,
            path: pathSisa,
            method: 'GET',
            rejectUnauthorized: false
        };
        // Realizar GET request
        return new Promise(function (resolve, reject) {
            var reqGet = https.request(optionsgetmsg, function (res) {
                res.on('data', function (d) {
                    //console.info('GET de Sisa ' + nroDocumento + ':\n');
                    if (d.toString())
                        xml = xml + d.toString();
                });
                res.on('end', function () {
                    if (xml) {
                        //Se parsea el xml obtenido a JSON
                        to_json(xml, function (error, data) {
                            if (error) {
                                resolve([500, {}]);
                            }
                            else {
                                //console.log(data);
                                resolve([res.statusCode, data]);
                            }
                        });
                    }
                    else
                        resolve([res.statusCode, {}]);
                });
            });
            reqGet.end();
            reqGet.on('error', function (e) {
                reject(e);
            });
        });
    };
    servicioSisa.prototype.formatearDatosSisa = function (datosSisa) {
        var ciudadano;
        var fecha;
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
        //Se arma un objeto de dirección
        ciudadano.direccion = [];
        var domicilio;
        domicilio = new Object();
        if (datosSisa.domicilio) {
            if (datosSisa.pisoDpto && datosSisa.pisoDpto != "0 0") {
                domicilio.valor = datosSisa.domicilio + " " + datosSisa.pisoDpto;
            }
            domicilio.valor = datosSisa.domicilio;
        }
        if (datosSisa.codigoPostal) {
            domicilio.codigoPostal = datosSisa.codigoPostal;
        }
        var ubicacion;
        ubicacion = new Object();
        if (datosSisa.localidad) {
            ubicacion.localidad = datosSisa.localidad;
        }
        if (datosSisa.provincia) {
            ubicacion.provincia = datosSisa.provincia;
        }
        //Ver el pais de la ubicación
        domicilio.ranking = 1;
        domicilio.activo = true;
        domicilio.ubicacion = ubicacion;
        ciudadano.direccion.push(domicilio);
        if (datosSisa.sexo) {
            if (datosSisa.sexo == "F") {
                ciudadano.sexo = "femenino";
                ciudadano.genero = "femenino";
            }
            else {
                ciudadano.sexo = "masculino";
                ciudadano.genero = "masculino";
            }
        }
        if (datosSisa.fechaNacimiento) {
            fecha = datosSisa.fechaNacimiento.split("-");
            var fechaNac = new Date(fecha[2].substr(0, 4), fecha[1] - 1, fecha[0]);
            ciudadano.fechaNacimiento = fechaNac.toJSON();
        }
        if (datosSisa.estadoCivil) {
        }
        if (datosSisa.fallecido != "NO") {
            if (datosSisa.fechaFallecimiento) {
                fecha = datosSisa.fechaFallecimiento.split("-");
                var fechaFac = new Date(fecha[2].substr(0, 4), fecha[1], fecha[0]);
                ciudadano.fechaFallecimiento = fechaFac.toJSON();
            }
        }
        //console.log(ciudadano);
        return ciudadano;
    };
    servicioSisa.prototype.getPacienteSisa = function (nroDocumento, sexo) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var paciente = null;
            _this.getSisaCiudadano(nroDocumento, config.usuarioSisa, config.passwordSisa)
                .then(function (resultado) {
                if (resultado) {
                    //console.log(resultado);
                    var dato = _this.formatearDatosSisa(resultado[1].Ciudadano);
                    resolve(dato);
                }
                resolve(null);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    };
    servicioSisa.prototype.matchSisa = function (paciente) {
        var _this = this;
        //Verifica si el paciente tiene un documento valido y realiza la búsqueda a través de Sisa
        var matchPorcentaje = 0;
        var pacienteSisa = {};
        var weights = {
            identity: 0.3,
            name: 0.3,
            gender: 0.1,
            birthDate: 0.3 //0.1
        };
        paciente["matchSisa"] = 0;
        //Se buscan los datos en sisa y se obtiene el paciente
        return new Promise(function (resolve, reject) {
            if (paciente.documento) {
                if (paciente.documento.length >= 7) {
                    _this.getSisaCiudadano(paciente.documento, config.usuarioSisa, config.passwordSisa)
                        .then(function (resultado) {
                        if (resultado) {
                            //Verifico el resultado devuelto por el rest de Sisa
                            if (resultado[0] == 200) {
                                switch (resultado[1].Ciudadano.resultado) {
                                    case 'OK':
                                        pacienteSisa = _this.formatearDatosSisa(resultado[1].Ciudadano);
                                        matchPorcentaje = _this.matchPersonas(paciente, pacienteSisa);
                                        paciente["matchSisa"] = matchPorcentaje;
                                        //auxPac.set('matchSisa', valorSisa)
                                        console.log('Datos: ', paciente);
                                        resolve({ "paciente": paciente, "matcheos": { "entidad": "Sisa", "matcheo": matchPorcentaje } });
                                        break;
                                    case 'MULTIPLE_RESULTADO':
                                        var sexo = "F";
                                        if (paciente.sexo == "femenino") {
                                            sexo = "F";
                                        }
                                        if (paciente.sexo == "masculino") {
                                            sexo = "M";
                                        }
                                        _this.getSisaCiudadano(paciente.documento, config.usuarioSisa, config.passwordSisa, sexo)
                                            .then(function (res) {
                                            if (res[1].Ciudadano.resultado == 'OK') {
                                                pacienteSisa = _this.formatearDatosSisa(res[1].Ciudadano);
                                                matchPorcentaje = _this.matchPersonas(paciente, pacienteSisa);
                                                matchPorcentaje = (matchPorcentaje * 100);
                                                paciente["matchSisa"] = matchPorcentaje;
                                                //auxPac.set('matchSisa', valorSisa)
                                                //console.log('Datos: ', paciente);
                                                resolve({ "paciente": paciente, "matcheos": { "entidad": "Sisa", "matcheo": matchPorcentaje } });
                                            }
                                        })
                                            .catch(function (err) {
                                            reject(err);
                                        });
                                    default:
                                        resolve({ "paciente": paciente, "matcheos": { "entidad": "Sisa", "matcheo": 0 } });
                                        break;
                                }
                            }
                        }
                        resolve({ "paciente": paciente, "matcheos": { "entidad": "Sisa", "matcheo": 0 } });
                    })
                        .catch(function (err) {
                        console.error('Error consulta rest Sisa:' + err);
                        reject(err);
                    });
                }
                else {
                    resolve({ "paciente": paciente, "matcheos": { "entidad": "Sisa", "matcheo": 0 } });
                }
            }
            else {
                resolve({ "paciente": paciente, "matcheos": { "entidad": "Sisa", "matcheo": 0 } });
            }
        });
    };
    return servicioSisa;
}());
exports.servicioSisa = servicioSisa;
//# sourceMappingURL=servicioSisa.js.map