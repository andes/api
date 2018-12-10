import { Practica } from '../schemas/practica';


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
    
    let findPracticasById = async (practicasIds) => {
        let res = await Practica.find({ _id: { $in: practicasIds } });
        practicas = practicas.concat(res);
        let promises = res.map(async (practica: any) => {
            if (practica.requeridos) {
                await findPracticasById(practica.requeridos.map((e) => e._id));
            }
        });
        return Promise.all(promises).then(() => {return practicas; } );
    };

    return await findPracticasById(idsPracticas);
}

/**
 * Busca una práctica por codigo NBU
 *
 * @export
 * @param {*} codigo
 * @returns
 */
export async function getPracticaByCodigo(codigo) {
    let result = await Practica.find( { $and: [{ codigoNomenclador: { $ne: '' } }, { codigo }] } ).exec();
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
