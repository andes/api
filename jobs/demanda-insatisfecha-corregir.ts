import { listaEspera } from '../modules/turnos/schemas/listaEspera';
import { Agenda } from '../modules/turnos/schemas/agenda';
import { Auth } from '../auth/auth.class';
import { userScheduler } from '../config.private';
import * as moment from 'moment';

/**
 * job para cerrar demandas, de acuerdo a los turnos asignados
 *  */

async function run(done) {
    const params = { estado: 'pendiente' };
    const listaEsperaPend = listaEspera.find(params).cursor({ batchSize: 100 });

    for await (const lista of listaEsperaPend) {
        try {
            const conceptId = lista.tipoPrestacion.conceptId;
            const pacienteId = lista.paciente.id;
            const listDemandas: any[] = lista.demandas.sort((a, b) => (a.fecha - b.fecha));
            if (lista.demandas.length) {
                const fechaDemIni = listDemandas[0].fecha;
                const fechaDemFin = listDemandas[listDemandas.length - 1].fecha;
                const fechaHoy = moment(new Date()).toDate();
                let turnos = await getTurnosAsignados('turno', pacienteId, conceptId, fechaDemIni, fechaHoy) || [];
                if (turnos.length) {
                    await resolverDemanda(lista, listDemandas, turnos, fechaDemFin, null);
                } else {
                    turnos = await getTurnosAsignados('sobreturno', pacienteId, conceptId, fechaDemIni, fechaHoy) || [];
                    if (turnos.length) {
                        await resolverDemanda(lista, listDemandas, turnos, fechaDemFin, null);
                    }
                }

            }
        } catch (error) {

        }
    }
    done();
}

async function getTurnosAsignados(tipo = 'turno', pacienteId, conceptId: String, fechaDemIni: Date, fechaHasta: Date) {
    const tipoDacion = tipo === 'turno' ? 'sobreturnos' : 'bloques.turnos';
    const match1 = {};
    match1[`${tipoDacion}.paciente.id`] = pacienteId;
    match1[`${tipoDacion}.tipoPrestacion.conceptId`] = conceptId;
    match1[`${tipoDacion}.estado`] = 'asignado';

    const match2 = { ...match1 };
    match2['updatedAt'] = {
        $gte: fechaDemIni,
        $lte: fechaHasta
    };
    match2['estado'] = {
        $in: ['disponible', 'publicada', 'pendienteAsistencia', 'pendienteAuditoria', 'auditada']
    };
    const unwind1 = tipo === 'turno' ? { $unwind: '$bloques' } : { $unwind: '$sobreturnos' };
    const unwind2 = tipo === 'turno' ? { $unwind: '$bloques.turnos' } : null;

    const project = {
        _id: 0,
        idAgenda: '$_id',
        fechaAgenda: '$horaInicio',
        organizacion: '$createdBy.organizacion',
        profesionales: '$profesionales',
        turno: `$${tipoDacion}`
    };
    const pipeline = [];
    pipeline.push({ $match: match2 });
    pipeline.push(unwind1);
    if (unwind2) {
        pipeline.push(unwind2);
    }
    pipeline.push({ $match: match1 });
    pipeline.push({ $project: project });
    return await Agenda.aggregate(pipeline).sort({ fechaAgenda: 1 });
}


async function resolverDemanda(lista, listDemandas, turnos, fechaDemFin, fechaResolucion = null) {
    fechaResolucion = fechaResolucion || moment(new Date()).toDate();
    let demandasNew = [];
    let demandasOld = [];
    if (turnos[0].fechaAgenda <= fechaDemFin) {
        // existe turno en medio del periodo de una demanda
        // se divide la demanda y se cierra la original
        demandasOld = listDemandas.filter(d => d.fecha < turnos[0].fechaAgenda).map(d => d);
        demandasNew = listDemandas.filter(d => d.fecha > turnos[0].fechaAgenda).map(d => d);
        lista.demandas = demandasOld;
    }
    lista.estado = 'resuelto';
    lista.resolucion = {
        fecha: fechaResolucion,
        motivo: 'turno asignado',
        turno: {
            idAgenda: turnos[0].idAgenda,
            organizacion: turnos[0].organizacion,
            id: turnos[0].turno._id,
            horaInicio: turnos[0].turno.fecha,
            tipo: turnos[0].turno.tipoTurno,
            emitidoPor: turnos[0].turno.emitidoPor,
            fechaHoraDacion: turnos[0].turno.fechaHoraDacion,
            profesionales: turnos[0].profesionales || null
        }
    };
    Auth.audit(lista, (userScheduler as any));
    await lista.save();

    if (demandasNew.length) {
        const newLista = new listaEspera({
            estado: 'pendiente',
            paciente: lista.paciente,
            fecha: demandasNew[0].fecha,
            vencimiento: lista.vencimiento,
            demandas: demandasNew,
            tipoPrestacion: lista.tipoPrestacion
        });
        Auth.audit(newLista, (userScheduler as any));
        await listaEspera.create(newLista);
    }

}
export = run;
