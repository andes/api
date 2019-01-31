import { handleHttpRequest } from './requestHandler';
import * as configPrivate from './../config.private';

/**
 *
 * @param direccion Dirección del paciente según su esquema.
 * @returns coordenadas: { latitud, longitud } en caso de éxito. De lo contrario null.
 */
export async function getGeoreferencia(direccion) {
    const address = direccion[0].valor + ',' + direccion[0].ubicacion.localidad.nombre
        + ',' + direccion[0].ubicacion.provincia.nombre;
    let pathGoogleApi = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address + ', ' + 'AR' + '&key=' + configPrivate.geoKey;

    pathGoogleApi = limpiarTildes(pathGoogleApi);

    const [status, body] = await handleHttpRequest(pathGoogleApi);
    const salida = JSON.parse(body);
    if (salida.status === 'OK') {
        let respuesta;
        for (let elto of salida.results) {
            // se obtiene la localidad del resultado (pueden ser varios resultados)
            let localidad = elto.address_components.find(atributo => atributo.types[0] === 'locality');
            if (localidad) {
                localidad = limpiarTildes(localidad.short_name);
                let localidadPaciente = limpiarTildes(direccion[0].ubicacion.localidad.nombre);
                // si la localidad coincide con la buscada, entonces la geolocalización se considera válida
                // se retorna el primer elemento que tenga coincidencia
                if (localidad.toUpperCase() === localidadPaciente.toUpperCase()) {
                    respuesta = elto.geometry.location;
                    break;
                }
            }
        }
        return respuesta;
    } else {
        return {};
    }
}

export function limpiarTildes(cadena) {
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
