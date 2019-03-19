import { Practica } from '../schemas/practica';
import { toArray } from '../../../../utils/utils';


/**
 * Find by Id
 *
 * @export
 * @param {*} id
 * @returns
 */
export async function findById(id) {
    return await Practica.findById(id);
}

export async function findByConceptId(conceptId: number) {
    return await Practica.findOne({ 'concepto.conceptId': conceptId });
}

/**
 * Busca prácticas por id y las retorna con todas las subpracticas cargadas en el array de requeridos.
 * Las practicas subpracticas son buscadas recursivamente mediante una funcion interna
 *
 * @export
 * @param {*} idPaciente
 * @param {*} conceptIdPractica
 * @returns
 */
// export async function getPracticasCompletas(idsPracticas) {
//     let findPracticasById = async (practicasIds) => {
//         let practicas = await Practica.find({ _id: { $in: practicasIds } });
//         let promises = practicas.map(async (practica: any) => {
//             if (practica.requeridos) {
//                 practica.requeridos = await findPracticasById(practica.requeridos.map((e) => e._id));
//             }
//         });
//         return Promise.all(promises).then(() => {return practicas; } );
//     };

//     return await findPracticasById(idsPracticas);
// }


/**
 * Busca prácticas por id y las retorna con todas las subpracticas cargadas en el array de requeridos.
 * Las practicas subpracticas son buscadas recursivamente mediante una funcion interna
 *
 * @export
 * @param {*} idPaciente
 * @param {*} conceptIdPractica
 * @returns
 */
export async function getPracticasCompletas(idsPracticas) {
    let practicas = [];

    let findPracticasById = async (practicasIds, deep) => {
        let res = await Practica.find({ _id: { $in: practicasIds } });
        res.forEach((e: any) => { e.nivel = deep; });
        practicas = practicas.concat(res);
        let promises = res.map(async (practica: any) => {
            if (practica.requeridos) {
                await findPracticasById(practica.requeridos.map((e) => e._id), deep + 1);
            }
        });
        return Promise.all(promises).then(() => { return practicas; });
    };

    return await findPracticasById(idsPracticas, 0);
}

/**
 * Busca una práctica por codigo NBU
 *
 * @export
 * @param {*} codigo
 * @param {*} soloNomencladas: booleano por defecto trae aquellas practicas que tienen un codigo de nomenclador, si esta en falso busca en todas
 * @returns
 */
export async function getPracticaByCodigo(codigo, NoNomencladas = false) {
    let query: any = {
        $and: [{ 'codigo': codigo.toUpperCase() }]
    };

    if (!NoNomencladas) {
        query.$and.push({ codigoNomenclador: { $ne: '' } });
    }

    let result = await Practica.find(query).exec();
    return result.length > 0 ? result[0] : null;
}

/**
 * Busca una practica por un valor que se matchea con nombre, descripcion o term de concepto snomed
 *
 * @export
 * @param {*} paramBusqueda
 * @param {*} soloSimples: booleano que indica si se debe buscar solo simples o simples y compuestas
 *  */
export async function findByDescripcion(paramBusqueda, soloSimples) {
    let query: any = {
        $or: [
            { descripcion: { $regex: paramBusqueda } },
            { nombre: { $regex: paramBusqueda } },
            { 'concepto.term': { $regex: paramBusqueda } }
        ],
        $and: [{ codigoNomenclador: { $ne: '' } }]
    };

    if (soloSimples) {
        query.$and.push({ categoria: { $eq: 'simple' } });
    }

    return await Practica.find(query);
}

/**
 *
 *
 * @export
 * @param {*} paramBusqueda
 * @param {*} soloSimples
 * @returns
 */
export async function getPracticasByArea(areaId) {
    return await Practica.find({ 'area.id': areaId });
}

export async function getPracticasCobasC311() {
    // Todo: en algun lugar filtrar solamente las practicas que el efector tiene habilitadas,
    // es posible que tenga practicas deshabilitadas momentaneamente por falta de reactivos

    let pipeline = [
        {
            $match: {
                'configuracionAnalizador.cobasC311': { $ne: null }
            }
        },
        {
            $project: {
                conceptId: '$concepto.conceptId'
            }
        }
    ];

    return await toArray(Practica.aggregate(pipeline).cursor({}).exec());
    // return await Practica.find({ 'configuracionAnalizador.cobasC311': { $ne: null } }).exec();
}

