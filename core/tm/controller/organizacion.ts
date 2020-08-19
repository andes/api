import { sisa } from '../../../config.private';
import { handleHttpRequest } from '../../../utils/requestHandler';
export async function validarOrganizacionSisa(orgCodSisa: Number) {
    const data = {
        usuario: sisa.username,
        clave: sisa.password
    };
    const url = sisa.urlEstablecimiento + orgCodSisa;
    const options = {
        url,
        method: 'POST',
        json: true,
        body: data
    };
    return await handleHttpRequest(options);
}
/**
 * Obtiene el listado de atenciones que brinda o no el establecimiento con el código sisa pasado por parámetro.
 * Es un listado grande de todas las prestaciones (no snomed) con un sí o no dependiendo si en el efector se realiza
 * esa prestación. Ejemmplo:
 *      <prestacion>
            <disponible>NO</disponible>
            <id>2</id>
            <nombre>Alergia e inmunología</nombre>
        </prestacion>
        <prestacion>
            <disponible>NO</disponible>
            <id>3</id>
            <nombre>Anestesiología</nombre>
        </prestacion>
 * @export
 * @param {Number} orgCodSisa
 * @returns
 */
export async function obtenerOfertaPrestacional(orgCodSisa: Number) {
    const data = {
        usuario: sisa.username,
        clave: sisa.password
    };
    const url = sisa.urlPrestacionesPorEfector + orgCodSisa;
    const options = {
        url,
        method: 'POST',
        json: true,
        body: data
    };
    return await handleHttpRequest(options);
}

export function addSector(itemSector, sector, padre) {
    if (String(itemSector._id) === padre) {
        itemSector.hijos.push(sector);
        return itemSector;
    } else {
        for (let index = 0; index < itemSector.hijos.length; index++) {
            itemSector.hijos[index] = addSector(itemSector.hijos[index], sector, padre);
        }
        return itemSector;
    }
}

export function changeSector(itemSector, sector) {
    if (String(itemSector._id) === sector._id) {
        return sector;
    } else {
        for (let index = 0; index < itemSector.hijos.length; index++) {
            itemSector.hijos[index] = changeSector(itemSector.hijos[index], sector);
        }
        return itemSector;
    }
}

export function deleteSector(itemSector, sector) {
    if (String(itemSector._id) === sector._id) {
        return null;
    } else {
        for (let index = 0; index < itemSector.hijos.length; index++) {
            itemSector.hijos[index] = deleteSector(itemSector.hijos[index], sector);
            if (!itemSector.hijos[index]) {
                itemSector.hijos.splice(index, 1);
            }
        }
        return itemSector;
    }
}
