import { Prestacion } from '../../rup/schemas/prestacion';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import { Types } from 'mongoose';
import moment = require('moment');
import { buscarEnHuds } from '../controllers/rup';
import { SnomedCtr } from '../../../core/term/controller/snomed.controller';
import { ObjectId } from '@andes/core';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';

/**
 * Libera la referencia al turno dentro de la solicitud
 *
 * @export
 * @param {*} tid id del turno que se libera
 * @param {*} req request
 */
export async function liberarRefTurno(turno, req) {
    try {
        const query = Prestacion.findOne({
            $and: [
                { 'estadoActual.tipo': 'pendiente' },
                { 'solicitud.turno': mongoose.Types.ObjectId(turno.id) }
            ]
        });
        let prestacion: any = await query.exec();
        if (!prestacion) {
            return { err: 'No se encontro prestacion para el turno' };
        } else if (prestacion.solicitud) {
            prestacion.solicitud.turno = null;

            updateRegistroHistorialSolicitud(prestacion.solicitud, req.body);
            Auth.audit(prestacion, req);
            return prestacion.save();
        }
    } catch (err) {
        return (err);
    }
}

/**
 * Crea un nuevo registro de historial de la solicitud segun los datos enviados en el body del request
 *
 * @export
 * @param {*} tid id del turno que se libera
 * @param {*} req request
 */
export function updateRegistroHistorialSolicitud(solicitud, datos) {
    const descripcionesAccion = {
        creacion: 'Creada',
        citar: 'Paciente citado',
        rechazada: 'Contrarreferida',
        pendiente: 'Aceptada',
        referir: 'Referida',
        asignarTurno: 'Turno asignado',
        liberarTurno: 'Turno liberado',
        asignada: 'Profesional asignado',
        validada: 'Validada',
        ejecucion: 'Ejecutada',
        romperValidacion: 'Ejecutada',
        anulada: 'Anulada',
        devolver: 'Devuelta',
        indefinida: 'Modificada'
    };

    if (!solicitud.historial) {
        solicitud.historial = [];
    }

    let registroHistorial: any = {
        organizacion: solicitud.organizacion,
        tipoPrestacion: solicitud.tipoPrestacion
    };

    /** La accion de historial es el tipo de PATCH que se realiza.
     * Si el PATCH es es un push de estado, la acción es el tipo de estado que se pushea */
    let _accion = datos.op === 'estadoPush' ? datos.estado.tipo : datos.op;
    registroHistorial.accion = descripcionesAccion[_accion] === undefined ? 'indefinida' : _accion;
    registroHistorial.descripcion = descripcionesAccion[registroHistorial.accion];

    let observaciones = datos.op === 'estadoPush' || datos.op === 'citar' ? datos.estado.observaciones : datos.observaciones;
    if (observaciones) {
        registroHistorial.observaciones = observaciones;
    }
    if (datos.turnos) {
        registroHistorial.turno = datos.turnos[0];
    }
    if (solicitud.profesional && solicitud.profesional.id) {
        registroHistorial.profesional = solicitud.profesional;
    }
    solicitud.historial.push(registroHistorial);
}


export async function enEjecucion(turno) {
    let prestacion: any = await Prestacion.findOne({ 'solicitud.turno': turno._id }).exec();
    return (prestacion && prestacion.ejecucion && prestacion.ejecucion.fecha);
}


export async function search(params) {
    return await Prestacion.find(params);
}


export async function hudsPaciente(pacienteID: ObjectId, expresion: string, idPrestacion: string, estado: string, deadline, valor?) {
    if (!expresion) {
        return null;
    }
    const paciente: any = await PacienteCtr.findById(pacienteID);
    if (!paciente) {
        return null;
    }

    const query = {
        'paciente.id': { $in: paciente.vinculos },
        'estadoActual.tipo': estado,
    };

    if (idPrestacion) {
        query['_id'] = Types.ObjectId(idPrestacion);
    }

    if (deadline) {
        query['ejecucion.fecha'] = {
            $gte: moment(deadline).startOf('day').toDate()
        };
    }

    const prestaciones = await Prestacion.find(query);

    if (!prestaciones) {
        return null;
    }

    const conceptos = await SnomedCtr.getConceptByExpression(expresion);
    let huds = buscarEnHuds(prestaciones, conceptos);
    if (valor) {
        huds = huds.filter(p => p.registro.valor);
    }
    return huds;
}
