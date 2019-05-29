import { Matching } from '@andes/match';
import * as config from '../config';
import * as configPrivate from '../config.private';
const to_json = require('xmljson').to_json;
import * as requestHandler from '../utils/requestHandler';

/**
 * @deprecated
 */
async function getSisaCiudadano(nroDocumento, usuario, clave, sexo) {
    /**
     * Capítulo 5.2.2 - Ficha del ciudadano
     * Se obtienen los datos desde Sisa
     * Ejemplo de llamada https://sisa.msal.gov.ar/sisa/services/rest/cmdb/obtener?nrodoc=26334344&usuario=user&clave=pass
     * Información de Campos https://sisa.msal.gov.ar/sisa/sisadoc/index.jsp?id=cmdb_ws_042
     */
    let pathSisa = `${configPrivate.sisa.url}nrodoc=${nroDocumento}&usuario=${usuario}&clave=${clave}`;
    if (sexo) {
        pathSisa += `&sexo=${sexo}`;
    }
    let response = await requestHandler.handleHttpRequest({ uri: pathSisa, rejectUnauthorized: false });
    let parsedResponse;
    to_json(response[1], (error, data) => {
        if (error) {
            return error;
        } else {
            parsedResponse = data;
        }
    });
    return parsedResponse;
}


/**
 * @deprecated
 */
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
        const fechaNac = new Date(fecha[2].substr(0, 4), fecha[1] - 1, fecha[0]);
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
            const fechaFac = new Date(fecha[2].substr(0, 4), fecha[1], fecha[0]);
            ciudadano.fechaFallecimiento = fechaFac.toJSON();
        }
    }
    return ciudadano;
}


export async function getPacienteSisa(nroDocumento, sexo?: string) {
    let resultadoSisa = await getSisaCiudadano(nroDocumento, configPrivate.sisa.username, configPrivate.sisa.password, sexo);
    if (resultadoSisa) {
        const dato = formatearDatosSisa(resultadoSisa.Ciudadano);
        return (dato);
    } else {
        return (null);
    }
}


export async function matchSisa(paciente) {
    // Verifica si el paciente tiene un documento valido y realiza la búsqueda a través de Sisa
    let matchPorcentaje = 0;
    let pacienteSisa = {};
    const weights = config.mpi.weightsDefault;
    const match = new Matching();
    paciente['matchSisa'] = 0;
    // Se buscan los datos en sisa y se obtiene el paciente
    const noIdentificadoSisa = (paciente.entidadesValidadoras) ? (paciente.entidadesValidadoras.indexOf('sisa') < 0) : true;
    if (paciente.documento && noIdentificadoSisa && (paciente.documento.toString()).length >= 7) {
        let sexo = null;
        if (paciente.sexo) {
            sexo = ((paciente.sexo) === 'femenino') ? 'F' : 'M';
        }
        // OJO: Es sólo para pacientes con SEXO debido a que pueden existir distintos pacientes con el mismo DNI
        let resultadoSisa = await getSisaCiudadano(paciente.documento, configPrivate.sisa.username, configPrivate.sisa.password, sexo);
        // Verifico el resultado devuelto por el rest de Sisa
        if (resultadoSisa && resultadoSisa.Ciudadano && resultadoSisa.Ciudadano.identificadoRenaper && resultadoSisa.Ciudadano.identificadoRenaper !== 'NULL') {
            pacienteSisa = formatearDatosSisa(resultadoSisa.Ciudadano);
            matchPorcentaje = match.matchPersonas(paciente, pacienteSisa, weights, 'Levenshtein');
            matchPorcentaje = (matchPorcentaje * 100);
            return ({ paciente, matcheos: { entidad: 'Sisa', matcheo: matchPorcentaje, datosPaciente: pacienteSisa } });
        } else {
            return ({ paciente, matcheos: { entidad: 'Sisa', matcheo: 0, datosPaciente: null } });
        }

    } else {
        return ({ paciente, matcheos: { entidad: 'Sisa', matcheo: 0, datosPaciente: null } });
    }
}
