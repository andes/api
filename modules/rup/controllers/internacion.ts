import { model as Prestacion } from '../schemas/prestacion';
import * as camasController from './../controllers/cama';
import * as utils from '../../../utils/utils';


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

export async function PasesParaCenso(dtoCama) {
    try {
        let pases = await camasController.buscarPasesCamaXInternacion(dtoCama.ultimoEstado.idInternacion);
        let internacion = await Prestacion.findById(dtoCama.ultimoEstado.idInternacion);
        let salida = {
            cama: dtoCama._id,
            ultimoEstado: dtoCama.ultimoEstado,
            pases,
            internacion
        };
        return salida;
    } catch (error) {
        return error;
    }
}


export function listadoInternacion(filtros, organizacion) {
    let query;
    let opciones = {};
    if (organizacion) {
        opciones['ejecucion.organizacion.id'] = organizacion;
    }
    if (filtros.apellido) {
        opciones['paciente.apellido'] = {
            $regex: utils.makePattern(filtros.apellido)
        };
    }
    if (filtros.documento) {
        opciones['paciente.documento'] = {
            $regex: utils.makePattern(filtros.documento)
        };
    }
    let fechas = {};
    if (filtros.fechaIngresoDesde) {
        fechas['$gte'] = new Date(filtros.fechaIngresoDesde);
    }
    if (filtros.fechaIngresoHasta) {
        fechas['$lte'] = new Date(filtros.fechaIngresoHasta);

    }
    if (filtros.fechaIngresoHasta || filtros.fechaIngresoDesde) {
        opciones['ejecucion.registros.valor.informeIngreso.fechaIngreso'] = fechas;

    }
    if (filtros.estadoString) {
        opciones['$where'] = 'this.estados[this.estados.length - 1].tipo ==  \"' + filtros.estadoString + '\" && this.estados[this.estados.length - 1].tipo !=  \"modificada\"';

    } else {
        opciones['$where'] = 'this.estados[this.estados.length - 1].tipo !=  \"modificada\"';
    }

    opciones['solicitud.ambitoOrigen'] = 'internacion';
    opciones['solicitud.tipoPrestacion.conceptId'] = '32485007';
    return Prestacion.find(opciones).sort({ 'paciente.apellido': 1, 'ejecucion.registros.valor.informeIngreso.fechaIngreso': -1 });
}

