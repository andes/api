import { listaEspera } from '../modules/turnos/schemas/listaEspera';
import { Agenda } from '../modules/turnos/schemas/agenda';
import { Auth } from '../auth/auth.class';
import { userScheduler } from '../config.private';

async function run(done) {
    try {
        const params = { estado: 'pendiente' };
        const listaEsperaPend = await listaEspera.find({ estado: 'pendiente' }).cursor({ batchSize: 100 });
        for await (const lista of listaEsperaPend) {
            const listaId = lista.id;
            const conceptId = lista.tipoPrestacion.conceptId;
            const pacienteId = lista.paciente.id;
            let fechaDemIni = null;
            let fechaDemFin = null;

            for (const demanda of lista.demandas) {
                if (!fechaDemIni || demanda.fecha < fechaDemIni) {
                    fechaDemIni = demanda.fecha;
                }
                if (!fechaDemFin || demanda.fecha > fechaDemFin) {
                    fechaDemFin = demanda.fecha;
                }
            }

            const condicion = {
                estado: { $in: ['disponible', 'publicada', 'pendienteAsistencia', 'pendienteAuditoria', 'auditada'] },
                'bloques.turnos.estado': 'asignado',
                'bloques.turnos.paciente.id': pacienteId,
                'bloques.turnos.tipoPrestacion.conceptId': conceptId,
            };

            const agendas = await Agenda.find(condicion).cursor({ batchSize: 100 });

            for await (const agenda of agendas) {
                const horaInicio = agenda.horaInicio;
                const demandasNew = [];
                const demandasOld = [];

                for (const bloque of agenda.bloques) {
                    for (const turno of bloque.turnos) {
                        if (String(turno.paciente?.id) === String(pacienteId) && turno.tipoPrestacion.conceptId === conceptId && horaInicio > fechaDemIni) {
                            if (horaInicio <= fechaDemFin) {
                                for (let i = 0; i < lista.demandas.length; i++) {
                                    if (lista.demandas[i].fecha > horaInicio) {
                                        demandasNew.push(lista.demandas[i]);
                                    } else {
                                        demandasOld.push(lista.demandas[i]);
                                    }
                                }
                            }
                            lista.estado = 'resuelto';
                            if (demandasOld.length) {
                                lista.demandas = demandasOld;
                            }
                            Auth.audit(lista, (userScheduler as any));
                            await listaEspera.findByIdAndUpdate(listaId, lista);
                            if (demandasNew.length) {
                                const newLista = new listaEspera({
                                    paciente: lista.paciente,
                                    tipoPrestacion: lista.tipoPrestacion,
                                    fecha: lista.fecha,
                                    vencimiento: lista.vencimiento,
                                    estado: 'pendiente',
                                    demandas: demandasNew,
                                    resolucion: lista.resolucion,
                                });
                                Auth.audit(newLista, (userScheduler as any));
                                await listaEspera.create(newLista);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
    done();
}

export = run;
