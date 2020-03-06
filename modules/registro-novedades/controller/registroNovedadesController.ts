import { RegistroNovedades } from '../schemas/registroNovedadesSchema';
import { ModuloAndes } from '../schemas/moduloSchema';


export async function getById(id) {
    let novedad: any;
    if (id) {
        novedad = RegistroNovedades.findById(id);
    }
    return novedad;
}

export async function getAllNovedades(titulo, modulos, fechaIni, fechaFin, skip, limit) {
    let pipeline = [];
    let match: any = { $and: [] };
    let novedades = null;
    if (fechaIni) {
        match.$and.push({
            'fecha': { $gte: new Date(fechaIni) }
        });
    }
    if (fechaFin) {
        match.$and.push({
            'fecha': { $lte: new Date(fechaFin) }
        });
    }
    if (titulo) {
        match.$and.push({
            'titulo': { $regex: titulo }
        });
    }
    if (modulos.length) {
        match.$and.push({ 'modulo.id': { $in: modulos } });
    }
    if (match['$and'].length) {
        pipeline.push({ '$match': match });
    };
    pipeline.push({ $project: { fecha: 1, titulo: 1, descripcion: 1, modulo: 1, imagenes: 1, activa: 1 } });
    novedades = await RegistroNovedades.aggregate(pipeline).sort({ fecha: -1 }).skip(skip).limit(limit);
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
