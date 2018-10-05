import { model as Prestacion } from '../schemas/prestacion';
import * as camasController from './../controllers/cama';


export function buscarUltimaInternacion(idPaciente, estado, organizacion) {
    let query;
    if (estado) {
        query = Prestacion.find({
            $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + estado + '\"'
        });
    } else {
        query = Prestacion.find({}); // Trae todos
    }

    if (idPaciente) {
        query.where('paciente.id').equals(idPaciente);
    }
    if (organizacion) {
        query.where('ejecucion.organizacion.id').equals(organizacion);
    }

    query.where('solicitud.ambitoOrigen').equals('internacion');
    query.where('solicitud.tipoPrestacion.conceptId').equals('32485007'); // Ver si encontramos otra forma de diferenciar las prestaciones de internacion
    return query.sort({ 'solicitud.fecha': -1 }).limit(1).exec();
}

export function PasesParaCenso(dtoCama) {
    return new Promise((resolve, reject) => {
        camasController.buscarPasesCamaXInternacion(dtoCama.ultimoEstado.idInternacion).then(pases => {
            Prestacion.findById(dtoCama.ultimoEstado.idInternacion).then(internacion => {
                let salida = {
                    cama: dtoCama._id,
                    ultimoEstado: dtoCama.ultimoEstado,
                    pases,
                    internacion
                };
                resolve(salida);
            });
        }).catch(error => {
            reject(error);
        });

    });
}

