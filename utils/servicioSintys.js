"use strict";
var validateFormatDate_1 = require('./validateFormatDate');
var machingDeterministico_1 = require('./machingDeterministico');
var https = require('https');
var to_json = require('xmljson').to_json;
var servicioSintys = (function () {
    function servicioSintys() {
    }
    servicioSintys.prototype.matchPersonas = function (paciente, pacienteSintys) {
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
        var IPacSintys = {
            identity: pacienteSintys.documento,
            firstname: pacienteSintys.nombre,
            lastname: pacienteSintys.apellido,
            birthDate: validateFormatDate_1.ValidateFormatDate.convertirFecha(pacienteSintys.fechaNacimiento),
            gender: pacienteSintys.sexo
        };
        var valorSintys = m3.maching(IPac, IPacSintys, weights);
        return valorSintys;
    };
    servicioSintys.prototype.getPersonaSintys = function (nroDocumento) {
        var datosParseados;
        var xml = '';
        var organizacion = new Object();
        var pathSintys = '';
        var pathSintys = '/WCFSINTyS/wsPersona.asmx/GetPersona?dni=' + nroDocumento;
        var optionsgetmsg = {
            /*Este servicio debe ser llamado directamente desde los WS
            que están publicados en el servidor 10.1.232.8 ya que por cuestiones
            de seguridad de Sintys, sólo nos dejan consumir datos desde este servidor.
            */
            host: 'www.saludnqn.gov.ar',
            port: 443,
            path: pathSintys,
            method: 'GET',
            rejectUnauthorized: false
        };
        // Realizar GET request
        return new Promise(function (resolve, reject) {
            var reqGet = https.request(optionsgetmsg, function (res) {
                res.on('data', function (d) {
                    if (d.toString())
                        xml = xml + d.toString();
                });
                res.on('end', function () {
                    if (xml) {
                        //Se parsea el xml obtenido a JSON
                        console.log('el xml obtenido', xml);
                        to_json(xml, function (error, data) {
                            if (error) {
                                resolve([500, {}]);
                            }
                            else {
                                //console.log('XML parseado a JSON:',data.string._);
                                resolve([res.statusCode, data.string._]);
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
    servicioSintys.prototype.formatearDatosSintys = function (datosSintys) {
        var ciudadano;
        var fecha;
        ciudadano = new Object();
        ciudadano.documento = datosSintys.Documento ? datosSintys.Documento : '';
        //VER con las chicas ya que sintys no trae separado nbe y apellido.
        ciudadano.nombre = datosSintys.NombreCompleto ? datosSintys.NombreCompleto : '';
        //ciudadano.apellido ?
        //TEMA DE DIRECCIÓN VERS SI VALE LA PENA
        //No lo trae en este webService hay que invocar a otro con el idDelPaciente seleccionado, además no está funcionando ya hice el reclamo en sintys
        /*
        ciudadano.direccion = [];
        var domicilio;
        domicilio = new Object();
        if (datosSintys.domicilio) {
            if (datosSintys.pisoDpto && datosSintys.pisoDpto != "0 0") {
                domicilio.valor = datosSintys.domicilio + " " + datosSintys.pisoDpto;
            }
            domicilio.valor = datosSintys.domicilio;
        }
        
        if (datosSintys.codigoPostal) {
            domicilio.codigoPostal = datosSintys.codigoPostal;
        }
        var ubicacion;
        ubicacion = new Object();
        if (datosSintys.localidad) {
            ubicacion.localidad = datosSintys.localidad;
        }

        if (datosSintys.provincia) {
            ubicacion.provincia = datosSintys.provincia;
        }

        //Ver el pais de la ubicación
        domicilio.ranking = 1;
        domicilio.activo = true;
        domicilio.ubicacion = ubicacion;
        ciudadano.direccion.push(domicilio);
        */
        if (datosSintys.Sexo) {
            if (datosSintys.Sexo == "FEMENINO") {
                ciudadano.sexo = "femenino";
                ciudadano.genero = "femenino";
            }
            else {
                ciudadano.sexo = "masculino";
                ciudadano.genero = "masculino";
            }
        }
        if (datosSintys.FechaNacimiento) {
            fecha = datosSintys.FechaNacimiento.split("/");
            var fechaNac = new Date(fecha[2].substr(0, 4), fecha[1] - 1, fecha[0]);
            ciudadano.fechaNacimiento = fechaNac.toJSON();
        }
        /*
        if (datosSintys.estadoCivil) {
            // estadoCivil: {
            //     type: String,
            //     enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro", ""]
            // }

        }
        */
        /*
        if (datosSintys.fallecido != "NO") {
            if (datosSintys.fechaFallecimiento) {
                fecha = datosSintys.fechaFallecimiento.split("-");
                var fechaFac = new Date(fecha[2].substr(0, 4), fecha[1], fecha[0]);
                ciudadano.fechaFallecimiento = fechaFac.toJSON();

            }
        }
        */
        console.log('Muestra el objeto Persona: ', ciudadano);
        return ciudadano;
    };
    servicioSintys.prototype.getPacienteSintys = function (nroDocumento) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var paciente = null;
            _this.getPersonaSintys(nroDocumento)
                .then(function (resultado) {
                if (resultado) {
                    var dato = _this.formatearDatosSintys(JSON.parse(resultado[1])[0]);
                    resolve(dato);
                }
                resolve(null);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    };
    return servicioSintys;
}());
exports.servicioSintys = servicioSintys;
//# sourceMappingURL=servicioSintys.js.map