import { WebHookLog } from '../schemas/webhookLogSchema';


export async function getById(id) {
    let webhlog: any;
    if (id) {
        webhlog = WebHookLog.findById(id);
    }
    return webhlog;
}

export async function getAll(cadena, fechaIni, fechaFin, skip, limit) {
    let pipeline = [];
    let webhlog = null;
    let fI: any, fF: any;
    let condition = {}, conditionCadena: any = {}, condFecha: any = {};
    if (fechaIni) { fI = new Date(fechaIni); }
    if (fechaFin) { fF = new Date(fechaFin); }
    if (cadena) {
        conditionCadena = { $or: [{ url: { $regex: cadena } }, { event: { $regex: cadena } }] };
    }

    if (fI && fF) {
        condFecha = { updatedAt: { $gte: fI, $lte: fF } };
    } else {
        if (fI) { condFecha = { updatedAt: { $gte: fI } }; }
        if (fF) { condFecha = { updatedAt: { $lte: fF } }; }
    }

    condition['$and'] = [conditionCadena, condFecha];

    if (condition) {
        pipeline = [
            { $match: condition },
            { $unwind: '$response' },
            { $project: { methoh: 1, event: 1, url: 1, status: 1, messeage: '$response.message', updatedAt: 1 } }
        ];
        webhlog = await WebHookLog.aggregate(pipeline).skip(skip).limit(limit);
    } else {
        webhlog = await WebHookLog.find().skip(skip).limit(limit);
    }
    return webhlog;
}

exports.getAll = getAll;
exports.getById = getById;
