import { listaEspera } from '../modules/turnos/schemas/listaEspera';
import { Agenda } from '../modules/turnos/schemas/agenda';
import { Auth } from '../auth/auth.class';
import { userScheduler } from '../config.private';
import * as moment from 'moment';
import { demandaLog } from '../modules/turnos/citasLog';

/**
 * job para cerrar demandas, de acuerdo a los turnos asignados
 *  */

async function run(done) {
    const params = { estado: 'pendiente' };
    const listaEsperaPendientes = listaEspera.find(params).cursor({ batchSize: 100 });

    for await (const lista of listaEsperaPendientes) {
        try {
            const conceptId = lista.tipoPrestacion.conceptId;
            const pacienteId = lista.paciente.id;
            if (lista.demandas.length) {
                const demandas: any[] = lista.demandas.sort((a, b) => (a.fecha - b.fecha));
                const fechaInicioDemanda = demandas[0].fecha;
                const fechaFinDemanda = demandas[demandas.length - 1].fecha;
                const fechaHoy = moment().toDate();
                let turnos = await getTurnosAsignados('turno', pacienteId, conceptId, fechaInicioDemanda, fechaHoy) || [];
                if (turnos.length) {
                    await resolverDemanda(lista, demandas, turnos[0], fechaFinDemanda, null);
                } else {
                    turnos = await getTurnosAsignados('sobreturno', pacienteId, conceptId, fechaInicioDemanda, fechaHoy) || [];
                    if (turnos.length) {
                        await resolverDemanda(lista, demandas, turnos[0], fechaFinDemanda, null);
                    }
                }

            }
        } catch (error) {
            await demandaLog.error('job cerrar demanda', listaEsperaPendientes, error, userScheduler);
        }
    }
    done();
}

async function getTurnosAsignados(tipo = 'turno', pacienteId, conceptId: String, fechaDemIni: Date, fechaHasta: Date) {
    const tipoDacion = tipo === 'turno' ? 'bloques.turnos' : 'sobreturnos';
    const match1 = {};
    match1[`${tipoDacion}.paciente.id`] = pacienteId;
    match1[`${tipoDacion}.tipoPrestacion.conceptId`] = conceptId;
    match1[`${tipoDacion}.estado`] = 'asignado';

    const match2 = { ...match1 };
    match2['updatedAt'] = {
        $gte: fechaDemIni,
        $lte: fechaHasta
    };
    match2['horaInicio'] = {
        $gte: fechaDemIni
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


async function resolverDemanda(lista, listDemandas, turno, fechaDemFin, fechaResolucion = null) {
    fechaResolucion = fechaResolucion || moment(new Date()).toDate();
    let demandasNew = [];
    let demandasOld = [];
    listDemandas.map(d => {
        if (d.profesional?.id) {
            d.profesional._id = d.profesional.id;
        }
        if (d.organizacion?.id) {
            d.organizacion._id = d.organizacion.id;
        }
        return d;
    });
    if (turno.fechaAgenda <= fechaDemFin) {
        // existe turno en medio del periodo de una demanda
        // se divide la demanda y se cierra la original
        demandasOld = listDemandas.filter(d => d.fecha <= turno.fechaAgenda).map(d => d);
        demandasNew = listDemandas.filter(d => d.fecha > turno.fechaAgenda).map(d => d);
        lista.demandas = demandasOld;
    }
    lista.estado = 'resuelto';
    const dataTurno = turno.turno;
    lista.resolucion = {
        fecha: fechaResolucion,
        motivo: 'turno asignado',
        turno: {
            idAgenda: turno.idAgenda,
            organizacion: turno.organizacion,
            id: dataTurno._id,
            horaInicio: dataTurno.horaInicio,
            tipo: dataTurno.tipoTurno || 'sobreturno',
            emitidoPor: dataTurno.emitidoPor || '',
            fechaHoraDacion: dataTurno.fechaHoraDacion || dataTurno.createdAt || dataTurno.updatedAt,
            profesionales: turno.profesionales || null
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
