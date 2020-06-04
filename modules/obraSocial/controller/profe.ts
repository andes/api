import { Profe } from '../schemas/profe';

// obtiene las versiones de todos los padrones cargados (PROFE)
export async function obtenerVersiones() {
    let versiones = await Profe.distinct('version').exec(); // esta consulta obtiene un arreglo de strings
    for (let i = 0; i < versiones.length; i++) {
        versiones[i] = { version: versiones[i] };
    }
    versiones.sort((a, b) => compare(a.version, b.version));
    return versiones;
}

// Compara fechas. Junto con el sort ordena los elementos de mayor a menor.
function compare(a, b) {
    if (new Date(a) > new Date(b)) {
        return -1;
    }
    if (new Date(a) < new Date(b)) {
        return 1;
    }
    return 0;
}
