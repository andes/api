import { ValidateFormatDate } from './validateFormatDate';
import {
    machingDeterministico
} from './machingDeterministico';
import {
    IPerson
} from './IPerson';
import * as paciente from '../schemas/paciente';
import * as https from 'https';
import * as config from './config';
var to_json = require('xmljson').to_json;

export class servicioSisa {

    matchPersonas(paciente, pacienteSisa) {
        
        var m3 = new machingDeterministico();
        var weights = {
            identity: 0.3,
            name: 0.3,
            gender: 0.1,
            birthDate: 0.3
        };
        var IPac: IPerson = {
            identity: paciente.documento,
            firstname: paciente.nombre,
            lastname: paciente.apellido,
            birthDate: ValidateFormatDate.convertirFecha(paciente.fechaNacimiento),
            gender: paciente.sexo
        };

        var IPacSisa: IPerson = {
            identity: pacienteSisa.documento,
            firstname: pacienteSisa.nombre,
            lastname: pacienteSisa.apellido,
            birthDate: ValidateFormatDate.convertirFecha(pacienteSisa.fechaNacimiento),
            gender: pacienteSisa.sexo
        };
       // console.log("Paciente Match: ",IPac,IPacSisa);
        var valorSisa = m3.maching(IPac, IPacSisa, weights);
        //console.log("Paciente Match: ",IPac,IPacSisa);
       // console.log("Match: ",valorSisa);
        return valorSisa;
    }

    getSisaCiudadano(nroDocumento, usuario, clave, sexo ? : string) {
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
            host: 'sisa.msal.gov.ar', // nombre del dominio // (no http/https !)
            port: 443,
            path: pathSisa, //'/sisa/services/rest/puco/' + nroDocumento,
            method: 'GET', // do GET,
            rejectUnauthorized: false
        };
        // Realizar GET request
        return new Promise((resolve, reject) => {
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
                            } else {
                                //console.log(data);
                                resolve([res.statusCode, data])
                            }
                        });
                    } else
                        resolve([res.statusCode, {}]);
                });

            });
            reqGet.end();
            reqGet.on('error', function (e) {
                reject(e);
            });

        })
    }

    formatearDatosSisa(datosSisa) {
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
        ubicacion.localidad = new Object();
        ubicacion.provincia = new Object();
        if (datosSisa.localidad) {
            ubicacion.localidad.nombre = datosSisa.localidad;
        }

        if (datosSisa.provincia) {
            ubicacion.provincia.nombre = datosSisa.provincia;
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
            } else {
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
            // estadoCivil: {
            //     type: String,
            //     enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro", ""]
            // }

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

    }


    getPacienteSisa(nroDocumento, sexo ? : string) {
        return new Promise((resolve, reject) => {
            var paciente = null;
            this.getSisaCiudadano(nroDocumento, config.usuarioSisa, config.passwordSisa)
                .then((resultado) => {
                    if (resultado) {
                        //console.log(resultado);
                        var dato = this.formatearDatosSisa(resultado[1].Ciudadano);
                        resolve(dato);
                    }
                    resolve(null)
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }


    matchSisa(paciente) {
        //Verifica si el paciente tiene un documento valido y realiza la búsqueda a través de Sisa
        var matchPorcentaje = 0;
        var pacienteSisa = {};
        var weights = {
            identity: 0.3, //0.2
            name: 0.3, //0.3
            gender: 0.1, //0.4
            birthDate: 0.3 //0.1
        };
        paciente["matchSisa"] = 0;
        //Se buscan los datos en sisa y se obtiene el paciente
        return new Promise((resolve, reject) => {

            if (paciente.documento) {
                if (paciente.documento.length >= 7) {

                    this.getSisaCiudadano(paciente.documento, config.usuarioSisa, config.passwordSisa)
                        .then((resultado) => {
                            if (resultado) {
                                //Verifico el resultado devuelto por el rest de Sisa
                                console.log("Renaper",resultado[1].Ciudadano.identificadoRenaper);
                                if (resultado[0] == 200) {
                                    if(resultado[1].Ciudadano.identificadoRenaper && resultado[1].Ciudadano.identificadoRenaper != "NULL")
                                    {
                                    switch (resultado[1].Ciudadano.resultado) {
                                        case 'OK':
                                            pacienteSisa = this.formatearDatosSisa(resultado[1].Ciudadano);
                                            matchPorcentaje = this.matchPersonas(paciente, pacienteSisa);
                                            matchPorcentaje = (matchPorcentaje * 100);
                                            resolve({"paciente": paciente, "matcheos": {"entidad": "Sisa","matcheo": matchPorcentaje, "datosPaciente": pacienteSisa}});
                                            
                                            break;
                                        case 'MULTIPLE_RESULTADO':
                                            var sexo = "F";
                                            if (paciente.sexo == "femenino") {
                                                sexo = "F";
                                            }
                                            if (paciente.sexo == "masculino") {
                                                sexo = "M";
                                            }

                                            this.getSisaCiudadano(paciente.documento, config.usuarioSisa, config.passwordSisa, sexo)
                                                .then((res) => {
                                                    if (res[1].Ciudadano.resultado == 'OK') {
                                                        pacienteSisa = this.formatearDatosSisa(res[1].Ciudadano);
                                                        matchPorcentaje = this.matchPersonas(paciente, pacienteSisa);
                                                        matchPorcentaje = (matchPorcentaje * 100);
                                                        resolve({"paciente": paciente, "matcheos": {"entidad": "Sisa","matcheo": matchPorcentaje, "datosPaciente": pacienteSisa}});
                                                    }

                                                })
                                                .catch((err) => {
                                                    reject(err);
                                                })

                                        default:
                                            resolve({"paciente": paciente, "matcheos": {"entidad": "Sisa","matcheo": 0, "datosPaciente": null}});
                                            break;
                                    }
                                    }else{
                                        resolve({"paciente": paciente, "matcheos": {"entidad": "Sisa","matcheo": 0, "datosPaciente": null}});
                                    }

                                }

                            }
                            resolve({"paciente": paciente, "matcheos": {"entidad": "Sisa","matcheo": 0, "datosPaciente": null}});


                        })
                        .catch((err) => {
                            console.error('Error consulta rest Sisa:' + err)
                            reject(err);
                        });

                    // setInterval(consultaSisa,100);

                } else {
                    resolve({"paciente": paciente, "matcheos": {"entidad": "Sisa","matcheo": 0, "datosPaciente": null}});
                }
            } else {
                resolve({"paciente": paciente, "matcheos": {"entidad": "Sisa","matcheo": 0,"datosPaciente": null}});
            }
        })

    }


    //Cambiar el estado del paciente a validado y agregamos como entidad validadora a Sisa
    validarPaciente(pacienteActualizar, entidad){
         return new Promise((resolve, reject) => {
            pacienteActualizar.paciente.estado = "validado";
            if(pacienteActualizar.paciente.entidadesValidadoras.indexOf(entidad) <= -1) {
                pacienteActualizar.paciente.entidadesValidadoras.push(entidad);
            }
             console.log("Paciente Actualizar: ",pacienteActualizar);
             paciente.findByIdAndUpdate(pacienteActualizar.paciente._id, pacienteActualizar.paciente, {
                    new: true
                }, function (err, data) {
                    if (err){
                         reject(err);
                    }
                    else{
                        resolve({"paciente": data, "matcheos": pacienteActualizar.matcheos});
                        }
                });

         })
    }



//Cambiar el estado del paciente a validado y agregamos como entidad validadora a Sisa
    validarActualizarPaciente(pacienteActualizar,entidad,datosPacEntidad){
         return new Promise((resolve, reject) => {
             console.log("Datos a validar",datosPacEntidad);
            pacienteActualizar.paciente.estado = "validado";
            if(pacienteActualizar.paciente.entidadesValidadoras.indexOf(entidad) <= -1) {
                pacienteActualizar.paciente.entidadesValidadoras.push(entidad);
            }
            if(datosPacEntidad.apellido) {
                pacienteActualizar.paciente.apellido = datosPacEntidad.apellido;
            }
            if(datosPacEntidad.nombre) {
                pacienteActualizar.paciente.nombre = datosPacEntidad.nombre;
            }
            if(datosPacEntidad.direccion){
                for(var i=0;i<datosPacEntidad.direccion.length;i++){
                    pacienteActualizar.paciente.direccion.push(datosPacEntidad.direccion[i]);
                }
             }
             console.log("Direccion Vieja: ",pacienteActualizar.paciente.direccion);
             console.log("Direccion Nueva: ",datosPacEntidad.direccion);
             paciente.findByIdAndUpdate(pacienteActualizar.paciente._id, pacienteActualizar.paciente, {
                    new: true
                }, function (err, data) {
                    if (err){
                         reject(err);
                    }
                    else{
                        resolve({"paciente": data, "matcheos": pacienteActualizar.matcheos});
                        }
                });

         })
    }

}