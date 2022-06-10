import { ObjectId } from '@andes/core';
import { Types } from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import { userScheduler } from '../../../config.private';
import { AppCache } from '../../../connections';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { SnomedCtr } from '../../../core/term/controller/snomed.controller';
import { Prestacion, PrestacionHistorial } from '../../rup/schemas/prestacion';
import { buscarEnHuds } from '../controllers/rup';
import moment = require('moment');


/**
 * Libera la referencia al turno dentro de la solicitud
 *
 * @export
 * @param {*} tid id del turno que se libera
 * @param {*} req request
 */
export async function liberarRefTurno(turno, req) {
    try {
        const idTurno = Types.ObjectId(turno.id);
        const query = Prestacion.findOne({
            $and: [
                { 'estadoActual.tipo': 'pendiente' },
                { 'solicitud.turno': idTurno }
            ]
        });
        const prestacion: any = await query.exec();
        if (!prestacion) {
            return { err: 'No se encontro prestacion para el turno' };
        } else if (prestacion.solicitud) {
            updateRegistroHistorialSolicitud(prestacion.solicitud, req.body);
            prestacion.solicitud.turno = null;
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
        suspenderTurno: 'Turno suspendido',
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

    const registroHistorial: any = {
        organizacion: solicitud.organizacion,
        tipoPrestacion: solicitud.tipoPrestacion
    };

    /** La accion de historial es el tipo de PATCH que se realiza.
     * Si el PATCH es es un push de estado, la acción es el tipo de estado que se pushea */
    const _accion = datos.op === 'estadoPush' ? datos.estado.tipo : datos.op;
    registroHistorial.accion = descripcionesAccion[_accion] === undefined ? 'indefinida' : _accion;
    registroHistorial.descripcion = descripcionesAccion[registroHistorial.accion];

    const observaciones = datos.op === 'estadoPush' || datos.op === 'citar' ? datos.estado.observaciones : datos.observaciones;
    if (observaciones) {
        registroHistorial.observaciones = observaciones;
        if (observaciones.includes('agendaSuspendida')) {
            registroHistorial.idTurnoSuspendido = solicitud.turno;
        }
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
    const prestacion: any = await Prestacion.findOne({ 'solicitud.turno': turno._id }).exec();
    return (prestacion && prestacion.ejecucion && prestacion.ejecucion.fecha);
}


export async function search(params) {
    return await Prestacion.find(params);
}


export async function hudsPaciente(pacienteID: ObjectId, expresion: string, idPrestacion: string, estado: string, deadline, valor?, termSearch?, form?) {
    let useCache = true;
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
        useCache = false;
        query['_id'] = Types.ObjectId(idPrestacion);
    }

    if (deadline) {
        useCache = false;
        query['ejecucion.fecha'] = {
            $gte: moment(deadline).startOf('day').toDate()
        };
    }

    let prestaciones;
    if (useCache) {
        prestaciones = await AppCache.get(`huds-${pacienteID}`);
        if (!prestaciones) {
            prestaciones = await Prestacion.find(query);
            prestaciones = prestaciones.map(p => p.toJSON());
            AppCache.set(`huds-${pacienteID}`, prestaciones, 60 * 60);
        }
    } else {
        prestaciones = await Prestacion.find(query);
    }
    const conceptos = await SnomedCtr.getConceptByExpression(expresion, termSearch, form);
    let huds = buscarEnHuds(prestaciones, conceptos);
    if (valor) {
        huds = huds.filter(p => p.registro.valor);
    }
    return huds;
}

export async function updatePrestacionPatient(sourcePatient, idPaciente, idPacientePrincipal) {
    try {
        const query = { 'estadoActual.tipo': 'validada', 'paciente.id': idPaciente };
        const prestaciones: any = await Prestacion.find(query);
        const promises = prestaciones.map((p) => {
            p.paciente = {
                id: p.paciente.id,
                nombre: sourcePatient.nombre,
                apellido: sourcePatient.apellido,
                documento: sourcePatient.documento,
                sexo: sourcePatient.sexo,
                fechaNacimiento: sourcePatient.fechaNacimiento,
                obraSocial: sourcePatient.financiador.length > 0 ? sourcePatient.financiador[0] : null,
                idPacienteValidado: idPacientePrincipal
            };
            Auth.audit(p, userScheduler as any);
            p.save();
        });
        await Promise.all(promises);

    } catch (error) {
        return error;
    }
}

// Crea un nuevo registro (coleccion prestacionesHistorial) a partir de una prestacion y estado
export async function saveEnHistorial(prestacion, estado, req) {
    const raw = prestacion.toJSON();
    const copiaPrestacion: any = new PrestacionHistorial(raw);
    copiaPrestacion._id = new Types.ObjectId();
    copiaPrestacion.estados.push(estado);
    Auth.audit(copiaPrestacion, req);
    return copiaPrestacion.save();
}
