import { Types } from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import { checkRegla } from '../../top/controller/reglas';
import { updateRegistroHistorialSolicitud } from './prestacion';
import { Prestacion } from '../schemas/prestacion';
import { IPrestacion, IPrestacionDoc, IPrestacionRegistro, IPrestacionRegistroDoc } from '../prestaciones.interface';
import { Request } from '@andes/api-tool';
import { ObjectId } from '@andes/core';
import { EventCore } from '@andes/event-bus';


export function crearSolicitud(prestacion: IPrestacion, solicitud: IPrestacionRegistroDoc, regla, profesional) {

    const prestacionOrigen = regla?.origen?.prestaciones ?
        regla.origen.prestaciones.find(p => p.prestacion.conceptId === prestacion.solicitud.tipoPrestacion.conceptId)
        : { prestacion: prestacion.solicitud.tipoPrestacion };

    const prestacionDestino = regla ? regla.destino.prestacion : solicitud.valor.solicitudPrestacion.prestacionSolicitada;

    const nuevaPrestacion: any = {
        inicio: regla.destino.inicio || 'top',
        paciente: prestacion.paciente,
        servicioIntermedioId: regla.destino.servicioIntermedioId || null,
        solicitud: {
            prestacionOrigen: prestacion.id,
            fecha: prestacion.ejecucion.fecha ? prestacion.ejecucion.fecha : new Date(),
            turno: null,
            tipoPrestacion: prestacionDestino,
            tipoPrestacionOrigen: prestacionOrigen.prestacion ? prestacionOrigen.prestacion : prestacion.solicitud.tipoPrestacion,
            organizacionOrigen: prestacion.solicitud.organizacion,
            organizacion: solicitud.valor.solicitudPrestacion?.organizacionDestino || prestacion.ejecucion.organizacion,
            profesionalOrigen: profesional,
            profesional: {},
            ambitoOrigen: prestacion.solicitud.ambitoOrigen,
            registros: [],
            turneable: !!regla?.destino?.turneable && prestacion.solicitud.ambitoOrigen === 'ambulatorio', // [TODO] que depende de la regla y no tan hardcodeado,
            reglaId: regla?.id
        },
        estados: [{
            fecha: new Date(),
            tipo: prestacionOrigen.auditable ? 'auditoria' : 'pendiente'
        }],
    };
    if (solicitud.valor.solicitudPrestacion.profesionalesDestino) {
        nuevaPrestacion.solicitud.profesional = solicitud.valor.solicitudPrestacion.profesionalesDestino[0];
    } else if (solicitud.valor.solicitudPrestacion.autocitado) {
        nuevaPrestacion.solicitud.profesional = profesional;
    }
    nuevaPrestacion.solicitud.registros.push({ ...solicitud.toObject() });

    if (nuevaPrestacion.inicio === 'servicio-intermedio') {
        nuevaPrestacion.groupId = new Types.ObjectId();
    }

    return nuevaPrestacion;
}

export async function existeSolicitud(prestacion: IPrestacion, solicitud: IPrestacionRegistroDoc) {
    const existe = await Prestacion.count({
        'paciente.id': prestacion.paciente.id,
        'estadoActual.tipo': { $in: ['pendiente', 'auditoria'] },
        'solicitud.prestacionOrigen': prestacion.id,
        'solicitud.registros.0._id': solicitud.id
    });
    return existe > 0;
}


export async function buscarYCrearSolicitudes(prestacion: IPrestacionDoc, req: Request) {
    const usuarioProfesional = Auth.getProfesional(req);
    const registros = prestacion.getRegistros();

    const planes = registros.filter(registro => registro.esSolicitud);

    const reglas = await matchReglas(prestacion, planes, Auth.getOrganization(req));
    for (const plan of reglas) {
        if (!plan) { continue; }

        const { regla, solicitud } = plan;
        const existe = await existeSolicitud(prestacion, solicitud);

        if (!existe) {

            const dtoSolicitud = crearSolicitud(prestacion, solicitud, regla, usuarioProfesional);
            updateRegistroHistorialSolicitud(dtoSolicitud.solicitud, { op: 'creacion' });


            const nuevoPlan = new Prestacion(dtoSolicitud);
            Auth.audit(nuevoPlan, req);
            await nuevoPlan.save();

        }
    }
}
/**
 * Por cada solicitud revisa si tiene regla correspondiente o es autocitado
 * @param prestacion
 * @param planes
 * @param organizacionID
 */
async function matchReglas(prestacion: IPrestacion, planes: IPrestacionRegistro[], organizacionID: ObjectId): Promise<{ regla: any; solicitud: any }[]> {
    const ps = planes.map(async (solicitud) => {
        const valorRegistro = solicitud.valor || {};
        if (valorRegistro.solicitudPrestacion?.organizacionDestino || valorRegistro.solicitudPrestacion?.autocitado) {
            const regla = await checkRegla({
                organizacionOrigen: organizacionID,
                organizacionDestino: valorRegistro.solicitudPrestacion.organizacionDestino?.id || organizacionID,
                prestacionOrigen: prestacion.solicitud.tipoPrestacion.conceptId,
                prestacionDestino: valorRegistro.solicitudPrestacion.prestacionSolicitada.conceptId
            });
            return { regla, solicitud };
        } else if (valorRegistro.solicitudPrestacion?.autocitado) {
            return { regla: null, solicitud };
        } else {
            return null;
        }
    });
    return Promise.all(ps);
}

export async function cancelarPrestacionSolicitud(req, prestacion) {
    prestacion.ejecucion = { registros: [], organizacion: {}, fecha: null };
    prestacion.estados.push({ tipo: 'pendiente' });
    updateRegistroHistorialSolicitud(prestacion.solicitud, { op: 'pendiente' });
    const solicitud: any = new Prestacion(prestacion);
    Auth.audit(solicitud, req);
    await solicitud.save();
}

EventCore.on('rup:prestacion:validate', async (prestacion: IPrestacion) => {
    // [TODO] chequear duplicados al revalidar

    const regla = await checkRegla({
        estado: 'validada',
        organizacionOrigen: prestacion.solicitud.organizacion.id,
        organizacionDestino: prestacion.solicitud.organizacion.id,
        prestacionOrigen: prestacion.solicitud.tipoPrestacion.conceptId
    });
    if (regla) {

        if (Array.isArray(regla.destino.prestacion)) {
            throw new Error(`mala configuracion de la regla ${regla.id}`);
        }

        const informeRegla = regla.destino.informe;
        const datosSolicitud = prestacion.solicitud.registros[0]?.valor?.solicitudPrestacion || {};
        const informe = datosSolicitud.informe;

        // [TODO] de alguna forma debeŕia ser dinamico este chequeo, pueden aparecer otras cosas a futuro
        if (!informe && informeRegla !== 'required') {
            return;
        }


        const nuevaPrestacion = {
            inicio: regla.destino.inicio || 'servicio-intermedio', // [TODO] definir
            paciente: prestacion.paciente,
            groupId: prestacion.groupId,
            servicioIntermedioId: regla.destino.servicioIntermedioId || null,
            solicitud: {
                prestacionOrigen: prestacion.id,
                fecha: new Date(),
                turno: null,
                tipoPrestacion: regla.destino.prestacion,
                tipoPrestacionOrigen: prestacion.solicitud.tipoPrestacion,
                organizacionOrigen: prestacion.solicitud.organizacion,
                organizacion: prestacion.solicitud.organizacion,
                profesionalOrigen: prestacion.solicitud.profesional,
                profesional: {},
                ambitoOrigen: prestacion.solicitud.ambitoOrigen,
                registros: prestacion.solicitud.registros,
                turneable: !!regla?.destino?.turneable
            },
            estados: [{
                fecha: new Date(),
                tipo: 'pendiente'
            }],
            metadata: prestacion.metadata
        };
        updateRegistroHistorialSolicitud(nuevaPrestacion.solicitud, { op: 'creacion' });
        const user = Auth.getUserFromResource(prestacion);

        const nuevoPlan = new Prestacion(nuevaPrestacion);
        Auth.audit(nuevoPlan, user as any);
        await nuevoPlan.save();
    }

});
