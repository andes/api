/* Realiza la búsqueda del paciente en la bd LOCAL y en MPI remoto */
import { paciente, pacienteMpi } from "../schemas/paciente";

export function buscarPaciente(id) {
    return new Promise((resolve, reject) => {
        paciente.findById(id, function (err, data) {
            if (err) {
                reject(err);
            } else {
                if (data) {
                    let resultado = {
                        db: 'andes',
                        paciente: data
                    };
                    resolve(resultado);
                } else {
                    pacienteMpi.findById(id, function (err2, dataMpi) {
                        if (err2) {
                            reject(err2);
                        }
                        let resultado = {
                            db: 'mpi',
                            paciente: dataMpi
                        };
                        resolve(resultado);
                    });
                }
            }
        });
    });
}

/* Funciones de operaciones PATCH */
export function updateContactos(req, data) {
    data.markModified('contacto');
    Logger.log(req, 'mpi', 'update', {
        accion: 'updateContacto',
        ruta: req.url,
        method: req.method,
        data: data.contacto,
    });
    data.contacto = req.body.contacto;
}

export function updateRelaciones(req, data) {
    data.markModified('relaciones');
    data.relaciones = req.body.relaciones;
}

export function updateDireccion(req, data) {
    data.markModified('direccion');
    data.direccion = req.body.direccion;
}

export function updateCarpetaEfectores(req, data) {
    data.markModified('carpetaEfectores');
    data.carpetaEfectores = req.body.carpetaEfectores;
}

export function linkIdentificadores(req, data) {
    data.markModified('identificadores');
    if (data.identificadores) {
        data.identificadores.push(req.body.dto);
    } else {
        data.identificadores = [req.body.dto]; // Primer elemento del array
    }
}

export function unlinkIdentificadores(req, data) {
    data.markModified('identificadores');
    if (data.identificadores) {
        data.identificadores = data.identificadores.filter(x => x.valor !== req.body.dto);
    }
}

export function updateActivo(req, data) {
    data.markModified('activo');
    data.activo = req.body.dto;
}

export function updateRelacion(req, data) {
    if (data && data.relaciones) {
        let objRel = data.relaciones.find(elem => {
            if (elem && req.body.dto && elem.referencia && req.body.dto.referencia) {
                if (elem.referencia.toString() === req.body.dto.referencia.toString()) {
                    return elem;
                }
            }
        });

        if (!objRel) {
            data.markModified('relaciones');
            data.relaciones.push(req.body.dto);
        }
    }
}

export function deleteRelacion(req, data) {
    if (data && data.relaciones) {
        data.relaciones.find(function (value, index, array) {
            if (value && value.referencia && req.body.dto && req.body.dto.referencia) {
                if (value.referencia.toString() === req.body.dto.referencia.toString()) {
                    array.splice(index, 1);
                }
            }
        });
    }
}