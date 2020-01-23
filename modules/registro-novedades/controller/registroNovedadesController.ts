import { RegistroNovedades } from '../schemas/registroNovedadesSchema';
import { ModuloAndes } from '../schemas/moduloSchema';


export async function getById(id) {
    let novedad: any;
    if (id) {
        novedad = RegistroNovedades.findById(id);
    }
    return novedad;
}

export async function getAllNovedades(cadena, fechaIni, fechaFin, skip, limit) {
    let pipeline = [];
    let novedades = null;
    let fI: any, fF: any;
    let condition = {}, conditionCadena: any, condFecha: any;
    if (fechaIni) { fI = new Date(fechaIni); }
    if (fechaFin) { fF = new Date(fechaFin); }
    if (cadena) {
        let cad: RegExp = new RegExp(cadena, 'i');
        conditionCadena = { $or: [{ titulo: { $regex: cad } }, { 'modulo.nombre': { $regex: cad } }] }; //  { descripcion: { $regex: cadena } },
    }

    if (fI && fF) {
        condFecha = { fecha: { $gte: fI, $lte: fF } };
    } else {
        if (fI) { condFecha = { fecha: { $gte: fI } }; }
        if (fF) { condFecha = { fecha: { $lte: fF } }; }
    }

    if (conditionCadena && condFecha) {
        condition['$and'] = [conditionCadena, condFecha];
    } else {
        condition = (conditionCadena) ? conditionCadena : (condFecha) ? condFecha : null;
    }
    if (condition) {
        pipeline = [
            { $match: condition },
            { $project: { fecha: 1, titulo: 1, descripcion: 1, modulo: 1, imagenes: 1, activa: 1 } }
        ];
        novedades = await RegistroNovedades.aggregate(pipeline).sort({ fecha: -1 }).skip(skip).limit(limit);
    } else {
        novedades = await RegistroNovedades.find().sort({ fecha: -1 }).skip(skip).limit(limit);
    }
    return novedades;
}
export async function getAllModulosAndes() {
    return await ModuloAndes.find();
}
export async function postNovedad(newNov) {
    const newRegNovedad = new RegistroNovedades(newNov);
    await newRegNovedad.save();
    return newRegNovedad;
}

export async function patchNovedad(id, newNov) {
    let nov: any = await RegistroNovedades.findById(id);
    if (nov) {
        nov.fecha = (newNov.fecha && (newNov.fecha !== nov.fecha)) ? newNov.fecha : nov.fecha;
        nov.titulo = (newNov.titulo && (newNov.titulo !== nov.titulo)) ? newNov.titulo : nov.titulo;
        nov.descripcion = (newNov.descripcion && (newNov.descripcion !== nov.descripcion)) ?
            newNov.descripcion : nov.descripcion;
        nov.modulo = (newNov.modulo && (newNov.modulo !== nov.modulo)) ? newNov.modulo : nov.modulo;
        nov.imagenes = (newNov.imagenes && (newNov.imagenes !== nov.imagenes)) ? newNov.imagenes : nov.img;
        nov.activa = ((newNov.activa !== 'undefined') && (newNov.activa !== nov.activa)) ? newNov.activa : nov.activa;

        await nov.save();
    }
    return {
        RegistroNovedades: nov
    };
}


exports.getAllModulosAndes = getAllModulosAndes;
exports.getAllNovedades = getAllNovedades;
exports.getById = getById;
exports.patchNovedad = patchNovedad;
exports.postNovedad = postNovedad;
