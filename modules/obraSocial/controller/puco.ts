import { Puco } from '../schemas/puco';
import { ObraSocial } from '../schemas/obraSocial';

// obtiene las versiones de todos los padrones cargados
export async function obtenerVersiones() {
    let versiones = await Puco.distinct('version').exec();  // esta consulta obtiene un arreglo de strings
    for (let i = 0; i < versiones.length; i++) {
        versiones[i] = { version: versiones[i] };
    }
    versiones.sort((a, b) => compare(a.version, b.version));
    return versiones;
}

export async function pacientePuco(documento) {
    let padron = await this.obtenerVersiones();   // trae las distintas versiones de los padrones
    if (padron.length === 0) {
        return [];
    }
    padron = padron[0].version; // asigna el ultimo padron actualizado
    // realiza la busqueda por dni y el padron seteado anteriormente
    let resultOS = [];
    let rta: any = await Puco.find({ dni: Number.parseInt(documento, 10), version: padron }).exec();
    if (rta.length > 0) {
        let unaOS;
        // genera un array con todas las obras sociales para una version de padron dada
        for (let i = 0; i < rta.length; i++) {
            unaOS = await ObraSocial.find({ codigoPuco: rta[i].codigoOS }).exec();
            resultOS[i] = { codigoPuco: rta[i].codigoOS, nombre: (unaOS.length && unaOS[0].nombre) || '', financiador: (unaOS.length && unaOS[0].nombre || '') };
        }
    }
    return resultOS;
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
