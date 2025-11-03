
// import { MatchingAndes } from '@andes/match/lib/matchingAndes.class';
const { MatchingAndes } = require('@andes/match');
import * as localidad from '../schemas/localidad';
import * as provincia from '../schemas/provincia_model';
import { ZonaSanitaria } from '../schemas/zonaSanitarias';


/**
 * Obtiene provincia y localidad desde DB a partir de un matching contra los params de entrada
 * @param searchProvincia string de provincia
 * @param searchLocalidad string de localidad
 */
export async function matchUbicacion(searchProvincia: string, searchLocalidad: string) {
    const alg = new MatchingAndes();
    let match = 0;
    let matchLocalidad: any = [0, ''];
    let matchProvincia: any = [0, ''];
    const provincias: any = await provincia.find();

    // seleccionamos provincia con matching mas alto
    provincias.forEach(unaProv => {
        match = alg.levenshtein(searchProvincia, unaProv.nombre);
        matchProvincia = (match > matchProvincia[0]) ? [match, unaProv] : matchProvincia;
    });
    const localidades: any = await localidad.find({ 'provincia._id': matchProvincia[1]._id });
    match = 0;
    const loc = searchLocalidad.toLocaleLowerCase().replace(/_|\./g, '');
    // seleccionamos localidad con matching mas alto
    localidades.forEach(unaLoc => {
        match = alg.levenshtein(loc, unaLoc.nombre);
        matchLocalidad = (match > matchLocalidad[0]) ? [match, unaLoc] : matchLocalidad;
    });
    return { provincia: matchProvincia[1], localidad: matchLocalidad[1] };
}

/**
 * Obtiene zona sanitaria de una localidad
 * @param localidad ObjectId de localidad
 */
export async function getZona(idLocalidad) {
    let unaZona = null;
    const unaLocalidad: any = await localidad.findById(idLocalidad);
    if (unaLocalidad?.zona) {
        unaZona = await ZonaSanitaria.findById(unaLocalidad.zona._id);
    }
    return unaZona;
}
