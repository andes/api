import * as carpetaPaciente from '../../carpetas/schemas/carpetaPaciente';

export async function buscarCarpeta(req) {
    let carpeta;
    if (req.params.id) {
        carpeta = carpetaPaciente.findById(req.params.id);
    } else {
        if (req.query.documento && req.query.organizacion) {
            carpeta = carpetaPaciente.find({ documento: req.query.documento });
            carpeta.where('carpetaEfectores.organizacion._id').equals(req.query.organizacion);
        }
    }
    return await carpeta;
}

exports.buscarCarpeta = buscarCarpeta;
