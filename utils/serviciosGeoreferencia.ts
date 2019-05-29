import { handleHttpRequest } from './requestHandler';
import * as configPrivate from '../config.private';

/**
 * @deprecated
 * @param texto para autocompletar
 * @returns opciones
 */
export async function autocompletar(texto) {
    let pathGoogleApi = configPrivate.geocodingPaths.autocompletePart1 + texto + configPrivate.geocodingPaths.autocompletePart2 + configPrivate.geoKey;
    pathGoogleApi = formatear(pathGoogleApi);

    const [status, body] = await handleHttpRequest(pathGoogleApi);
    const salida = JSON.parse(body);
    if (salida.status === 'OK') {
        let respuesta = [];
        for (let elto of salida.predictions) {
            respuesta.push(elto.description);
        }
        return respuesta;
    } else {
        return {};
    }
}


/**
 * @deprecated
 * @param direccion: String. Dirección del paciente con formato << domicilio, localidad, provincia >>.
 * @returns coordenadas: { latitud, longitud } en caso de éxito. De lo contrario null.
 */
export async function getGeoreferencia(direccion) {
    const arrDireccion = direccion.split(', '); // Se separa lo que se encuentre entre comas
    let localidadBuscada = formatear(arrDireccion[1]);  // se obtiene la localidad y se formatea
    let pathGoogleApi = configPrivate.geocodingPaths.addressesPart1 + direccion + configPrivate.geocodingPaths.addressesPart2 + configPrivate.geoKey;
    pathGoogleApi = formatear(pathGoogleApi);
    const [status, body] = await handleHttpRequest(pathGoogleApi);
    const salida = JSON.parse(body);
    if (salida.status === 'OK') {
        let respuesta;
        for (let elto of salida.results) {
            // se obtiene la localidad del resultado (pueden ser varios resultados)
            let localidad = elto.address_components.find(atributo => atributo.types[0] === 'locality');
            if (localidad) {
                localidad = formatear(localidad.short_name);
                // si la localidad coincide con la buscada, entonces la geolocalización se considera válida
                // se retorna el primer elemento que tenga coincidencia
                if (localidad.toUpperCase() === localidadBuscada.toUpperCase()) {
                    respuesta = elto.geometry.location;
                    return respuesta;
                }
            }
        }
    } else {
        return {};
    }
}

/**
 * @deprecated
 */
export function formatear(cadena) {
    cadena = cadena.replace(/ /g, '+');
    cadena = cadena.replace(/á/gi, 'a');
    cadena = cadena.replace(/é/gi, 'e');
    cadena = cadena.replace(/í/gi, 'i');
    cadena = cadena.replace(/ó/gi, 'o');
    cadena = cadena.replace(/ú/gi, 'u');
    cadena = cadena.replace(/ü/gi, 'u');
    cadena = cadena.replace(/ñ/gi, 'n');

    return cadena;
}
