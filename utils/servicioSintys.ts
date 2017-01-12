import { ValidateFormatDate } from './validateFormatDate';
import {
    machingDeterministico
} from './machingDeterministico';
import {
    IPerson
} from './IPerson';
import * as https from 'https';
import * as config from './config';
var to_json = require('xmljson').to_json;

export class servicioSintys {

    matchPersonas(paciente, pacienteSintys) {
        
        var m3 = new machingDeterministico();
        var weights = {
            identity: 0.3,
            name: 0.3,
            gender: 0.1,
            birthDate: 0.3
        };
        var IPac: IPerson = {
            identity: paciente.documento,
            firstname: '',
            lastname: paciente.apellido + ' ' + paciente.nombre, //Se carga todo en el apellido
            birthDate: ValidateFormatDate.convertirFecha(paciente.fechaNacimiento),
            gender: paciente.sexo
        };

        var IPacSintys: IPerson = {
            identity: pacienteSintys.documento,
            firstname: '',
            lastname: pacienteSintys.apellido, //Se carga todo en el apellido
            birthDate: ValidateFormatDate.convertirFecha(pacienteSintys.fechaNacimiento),
            gender: pacienteSintys.sexo
        };

        console.log('El paciente prametro:', IPac);
        console.log('El paciente Sintys' ,IPacSintys);

        var valorSintys = m3.maching(IPac, IPacSintys, weights);
        console.log('Valor del matcheo:',valorSintys);
        return valorSintys;
    }


    getPersonaSintys(nroDocumento : string) {
        
        var datosParseados;
        var xml = '';
        var organizacion = new Object();
        var pathSintys = ''
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
        return new Promise((resolve, reject) => {
            var reqGet = https.request(optionsgetmsg, function (res) {
                res.on('data', function (d) {
                    if (d.toString())
                        xml = xml + d.toString();
                });

                res.on('end', function () {

                    if (xml) {
                        //Se parsea el xml obtenido a JSON
                        //console.log('el xml obtenido',xml);
                        to_json(xml, function (error, data) {
                            if (error) {
                                resolve([500, {}]);
                            } else {
                                //console.log('XML parseado a JSON:',data.string._);
                                resolve([res.statusCode, data.string._])
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

    formatearDatosSintys(datosSintys) {
        var ciudadano;
        var fecha;
        ciudadano = new Object();
       
        ciudadano.documento = datosSintys.Documento ? datosSintys.Documento.toString() : '';

        //VER con las chicas ya que sintys no trae separado nbe y apellido.
        ciudadano.apellido = datosSintys.NombreCompleto  ? datosSintys.NombreCompleto : '';
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
            } else {
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


       // console.log('Muestra el objeto Persona: ',ciudadano);
        return ciudadano;

    }

    getPacienteSintys(nroDocumento) {
        return new Promise((resolve, reject) => {
            var paciente = null;
            this.getPersonaSintys(nroDocumento)
                .then((resultado) => {
                    if (resultado) {
                        var dato = this.formatearDatosSintys(JSON.parse(resultado[1])[0]);
                        resolve(dato);
                    }
                    resolve(null)
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }


    matchSintys(paciente) {
        //Verifica si el paciente tiene un documento valido y realiza la búsqueda a través de Sintys
        var matchPorcentaje = 0;
        var pacienteSintys = {};
        var weights = {
            identity: 0.3, //0.2
            name: 0.3, //0.3
            gender: 0.1, //0.4
            birthDate: 0.3 //0.1
        };
        paciente["matchSintys"] = 0;
        //Se buscan los datos en sintys y se obtiene el paciente
        return new Promise((resolve, reject) => {

            if (paciente.documento) {
                if (paciente.documento.length >= 7) {
                    console.log('antes del getPersonaSintys');
                    this.getPersonaSintys(paciente.documento)
                        .then((resultado) => {
                            if (resultado) {
                                //console.log('obtengo resultado de sintys ', resultado);
                                //Verifico el resultado devuelto por el rest de Sintys
                                if (resultado[0] == 200) {
                                    console.log('entro por 200');
                                    pacienteSintys = this.formatearDatosSintys(JSON.parse(resultado[1])[0]);
                                    matchPorcentaje = this.matchPersonas(paciente, pacienteSintys);
                                    console.log('el % de matcheo es:', matchPorcentaje);
                                    paciente["matchSintys"] = matchPorcentaje;
                                    //console.log('Datos: ', paciente);
                                    resolve({"paciente": paciente, "matcheos": {"entidad": "Sintys","matcheo": matchPorcentaje}});
                                }
                            }
                            resolve({"paciente": paciente, "matcheos": {"entidad": "Sintys","matcheo": 0}});
                        })
                        .catch((err) => {
                            console.error('Error consulta rest Sintys:' + err)
                            reject(err);
                        });

                    // setInterval(consultaSintys,100);

                } else {
                    resolve({"paciente": paciente, "matcheos": {"entidad": "Sintys","matcheo": 0}});
                }
            } else {
                resolve({"paciente": paciente, "matcheos": {"entidad": "Sintys","matcheo": 0}});
            }
        })

    }



}