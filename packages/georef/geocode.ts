import { requestHttp } from './request';
import { geoKey as API_KEY } from '../../config.private';
import { Coordenadas } from './index';

function removeSpecialCharacter(cadena) {
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

/**
 *
 * @param texto para autocompletar
 * @returns opciones
 */
export async function autocompletarDireccion(texto) {
    const req = {
        url: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        qs: {
            input: texto,
            types: 'address',
            components: 'country:ar',
            language: 'es',
            key: API_KEY
        },
        json: true
    };

    try {
        const [status, response] = await requestHttp(req);
        if (response.status === 'OK') {
            let predicciones = response.predictions.map(elem => elem.description);
            return predicciones;
        } else {
            return [];
        }
    } catch (err) {
        return [];
    }
}

/**
 * Obtiene la localidad de una direccion con formato "calle, localidad, provincia"
 */
function matchLocalidad(direccion: string) {
    const arrDireccion = direccion.split(','); // Se separa lo que se encuentre entre comas
    return removeSpecialCharacter(arrDireccion[1].trim());  // se obtiene la localidad y se formatea
}

/**
 *
 * @param direccion: String. Direccióncon formato << domicilio, localidad, provincia >>.
 * @returns coordenadas: { latitud, longitud } en caso de éxito. De lo contrario null.
 */
export async function geoReferenciar(direccion): Promise<Coordenadas> {
    const req = {
        url: 'https://maps.googleapis.com/maps/api/geocode/json',
        qs: {
            address: removeSpecialCharacter(direccion) + ', AR',
            key: API_KEY
        },
        json: true
    };

    try {
        const [status, response] = await requestHttp(req);
        if (response.status === 'OK') {
            const localidadBuscada = matchLocalidad(direccion);
            let coordenadas: Coordenadas;
            for (let elemento of response.results) {
                let localidad = elemento.address_components.find(atributo => atributo.types[0] === 'locality');
                if (localidad) {
                    localidad = removeSpecialCharacter(localidad.short_name);
                    if (localidad.toUpperCase() === localidadBuscada.toUpperCase()) {
                        coordenadas = elemento.geometry.location;
                        break;
                    }
                }
            }
            return coordenadas;
        } else {
            return null;
        }
    } catch (err) {
        return null;
    }
}

