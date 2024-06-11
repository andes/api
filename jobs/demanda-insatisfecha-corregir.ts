import { listaEspera } from '../modules/turnos/schemas/listaEspera';
import { Agenda } from '../modules/turnos/schemas/agenda';
import { Auth } from '../auth/auth.class';
import { userScheduler } from '../config.private';
import * as moment from 'moment';

async function run(done) {
    try {
        const params = { estado: 'pendiente' };
        const listaEsperaPend = listaEspera.find(params).cursor({ batchSize: 100 });
        const fechaHoy = moment(new Date()).toDate();
        for await (const lista of listaEsperaPend) {
            const conceptId = lista.tipoPrestacion.conceptId;
            const pacienteId = lista.paciente.id;
            const listDemandas: any[] = lista.demandas.sort((a, b) => (a.fecha - b.fecha));
            if (listDemandas.length) {
                const fechaDemIni = listDemandas[0].fecha;
                const fechaDemFin = listDemandas[listDemandas.length - 1].fecha;
                const pipeline = [
                    {
                        $match: {
                            'bloques.turnos.paciente.id': pacienteId,
                            'bloques.turnos.estado': 'asignado',
                            'bloques.turnos.tipoPrestacion.conceptId': conceptId,
                            updatedAt: {
                                $gte: fechaDemIni,
                                $lte: fechaHoy
                            },
                            estado: {
                                $in: ['disponible', 'publicada', 'pendienteAsistencia', 'pendienteAuditoria', 'auditada']
                            }
                        }
                    },
                    { $unwind: '$bloques' },
                    { $unwind: '$bloques.turnos' },
                    {
                        $match: {
                            'bloques.turnos.paciente.id': pacienteId,
                            'bloques.turnos.tipoPrestacion.conceptId': conceptId,
                            'bloques.turnos.estado': 'asignado'
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            idAgenda: '$_id',
                            fechaAgenda: '$horaInicio',
                            organizacion: '$createdBy.organizacion',
                            profesionales: '$profesionales',
                            turno: '$bloques.turnos'
                        }
                    }
                ];
                const turnos = await Agenda.aggregate(pipeline).sort({ fechaAgenda: 1 });
                let demandasNew = [];
                let demandasOld = [];
                if (turnos.length) {
                    if (turnos[0].fechaAgenda <= fechaDemFin) {
                        // hay que dividir la demanda y cerrar la original
                        demandasOld = listDemandas.filter(d => d.fecha < turnos[0].fechaAgenda).map(d => d);
                        demandasNew = listDemandas.filter(d => d.fecha > turnos[0].fechaAgenda).map(d => d);
                        lista.demandas = demandasOld;
                    }
                    lista.estado = 'resuelto';
                    lista.resolucion = {
                        fecha: fechaHoy,
                        motivo: 'turno asignado', // ver este motivo de dónde sacarlo (ver is hay algun esquema de esto en tareas futuras)
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
                    await listaEspera.update({ _id: lista._id }, { $set: lista });
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
            }
        }
    } catch (error) {
    }
    done();
}

export = run;
