import * as moment from 'moment';
import * as agendaModel from '../../turnos/schemas/agenda';

// Turno
export function darAsistencia(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.asistencia = 'asistio';
    // crearPrestacionVacia(turno, req);
}

// Turno
export function sacarAsistencia(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.asistencia = undefined;
}

// Turno
export function liberarTurno(req, data, turno) {
    let position = getPosition(req, data, turno._id);
    turno.estado = 'disponible';
    turno.paciente = null;
    turno.tipoPrestacion = null;
    turno.nota = null;
    turno.confirmedAt = null;
    let cant = 1;

    let turnoDoble = getTurnoSiguiente(req, data, turno._id);
    if (turnoDoble) {
        cant = cant + 1;
        turnoDoble.estado = 'disponible';
    }

    switch (turno.tipoTurno) {
        case ('delDia'):
            data.bloques[position.indexBloque].restantesDelDia = data.bloques[position.indexBloque].restantesDelDia + cant;
            data.bloques[position.indexBloque].restantesProgramados = 0;
            data.bloques[position.indexBloque].restantesProfesional = 0;
            data.bloques[position.indexBloque].restantesGestion = 0;
            break;
        case ('programado'):
            data.bloques[position.indexBloque].restantesProgramados = data.bloques[position.indexBloque].restantesProgramados + cant;
            break;
        case ('profesional'):
            data.bloques[position.indexBloque].restantesProfesional = data.bloques[position.indexBloque].restantesProfesional + cant;
            break;
        case ('gestion'):
            data.bloques[position.indexBloque].restantesGestion = data.bloques[position.indexBloque].restantesGestion + cant;
            break;
    }
    if (turno.tipoTurno) {
        turno.tipoTurno = undefined;
    }
}


// Turno
export function suspenderTurno(req, data, turno) {
    turno.estado = 'suspendido';
    delete turno.paciente;
    delete turno.tipoPrestacion;
    turno.motivoSuspension = req.body.motivoSuspension;

    let cant = 1;
    // Se verifica si tiene un turno doble asociado
    let turnoDoble = getTurnoSiguiente(req, data, turno._id);
    if (turnoDoble) {
        cant = cant + 1;
        turnoDoble.estado = 'suspendido';
        turnoDoble.motivoSuspension = req.body.motivoSuspension;
    }

    // El tipo de turno del cual se resta será en el orden : delDia, programado, autocitado, gestion
    let position = getPosition(req, data, turno._id);
    if (!turno.tipoTurno) {
        if (data.bloques[position.indexBloque].restantesDelDia > 0) {
            data.bloques[position.indexBloque].restantesDelDia = data.bloques[position.indexBloque].restantesDelDia - cant;
        } else {
            if (data.bloques[position.indexBloque].restantesProgramados > 0) {
                data.bloques[position.indexBloque].restantesProgramados = data.bloques[position.indexBloque].restantesProgramados - cant;
            } else {
                if (data.bloques[position.indexBloque].restantesProfesional > 0) {
                    data.bloques[position.indexBloque].restantesProfesional = data.bloques[position.indexBloque].restantesProfesional - cant;
                } else {
                    if (data.bloques[position.indexBloque].restantesGestion > 0) {
                        data.bloques[position.indexBloque].restantesGestion = data.bloques[position.indexBloque].restantesGestion - cant;
                    }
                }
            }
        }
    }
}

// Turno
export function guardarNotaTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.nota = req.body.textoNota;
}

// Turno
export function darTurnoDoble(req, data, tid = null) {   // NUEVO
    let position = getPosition(req, data, tid); // Obtiene la posición actual del turno seleccionado
    let agenda = data;
    let turnoAnterior;

    if ((position.indexBloque > -1) && (position.indexTurno > -1)) {
        turnoAnterior = agenda.bloques[position.indexBloque].turnos[position.indexTurno - 1]; // Obtiene el turno anterior

        // Verifico si existen turnos disponibles del tipo correspondiente
        let countBloques = calcularContadoresTipoTurno(position.indexBloque, position.indexTurno, agenda);
        if ((countBloques[turnoAnterior.tipoTurno] as number) === 0) {
            return ({
                err: 'No se puede asignar el turno doble ' + turnoAnterior.tipoTurno
            });
        } else {
            // se controla la disponibilidad de los tipos de turnos
            // el turno doble se otorgara si existe disponibilidad de la cantidad de tipo del turno asociado
            let turno = getTurno(req, data, tid);
            turno.estado = 'turnoDoble';
            switch (turnoAnterior.tipoTurno) {
                case ('delDia'):
                    data.bloques[position.indexBloque].restantesDelDia = countBloques.delDia - 1;
                    data.bloques[position.indexBloque].restantesProgramados = 0;
                    data.bloques[position.indexBloque].restantesProfesional = 0;
                    data.bloques[position.indexBloque].restantesGestion = 0;
                    break;
                case ('programado'):
                    data.bloques[position.indexBloque].restantesProgramados = countBloques.programado - 1;
                    break;
                case ('profesional'):
                    data.bloques[position.indexBloque].restantesProfesional = countBloques.profesional - 1;
                    break;
                case ('gestion'):
                    data.bloques[position.indexBloque].restantesGestion = countBloques.gestion - 1;
                    break;
            }

        }

    } else {
        return ({
            err: 'No se puede asignar el turno doble'
        });
    }

}

// Agenda
export function guardarNotaAgenda(req, data) {
    data.nota = req.body.nota;
}

// Agenda
export function editarAgenda(req, data) {
    if (req.body.profesional) {
        data.profesionales = req.body.profesional;
    }
    data.espacioFisico = req.body.espacioFisico;
}

// Agenda
export function agregarSobreturno(req, data) {
    let sobreturno = req.body.sobreturno;
    if (sobreturno) {
        let usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
        // Copia la organización desde el token
        usuario.organizacion = (req as any).user.organizacion;
        sobreturno.updatedAt = new Date();
        sobreturno.updatedBy = usuario;
        data.sobreturnos.push(sobreturno);
    }
}

// Agenda
export function actualizarEstado(req, data) {

    // Si se pasa a estado Pausada, guardamos el estado previo
    if (req.body.estado === 'pausada') {
        data.prePausada = data.estado;
    }

    // Si se pasa a publicada
    if (req.body.estado === 'publicada') {
        data.estado = 'publicada';
    }

    // Cuando se reanuda de un estado pausada, se setea el estado guardado en prePausa
    if (req.body.estado === 'prePausada') {
        data.estado = data.prePausada;
    } else {
        data.estado = req.body.estado;

        // Si se suspende una agenda, hay que enviar SMS a todos los pacientes
        if (req.body.estado === 'suspendida') {

            data.bloques.forEach(bloque => {
                bloque.turnos.forEach(turno => {

                    turno.estado = 'suspendido';
                    turno.motivoSuspension = 'agendaSuspendida';

                    if (turno.paciente.id && turno.paciente.telefono) {
                        let sms: any = {
                            telefono: turno.paciente.telefono,
                            mensaje: 'Le avisamos que su turno para el día ' + moment(turno.horaInicio).format('ll').toString() + ' a las ' + moment(turno.horaInicio).format('LT').toString() + 'hs fue suspendido'
                        };

                        console.log(turno.paciente);
                        console.log(sms);

                        // sendSms(sms, respuesta => {
                        //     if (respuesta === '0') {

                        //     }
                        // });
                    }
                });
            });
        }

    }
}

// Dada una Agenda completa + un id de Turno, busca y devuelve el Turno completo
export function getTurno(req, data, idTurno = null) {
    let turno;
    idTurno = String(idTurno) || req.body.idTurno;
    // Loop en los bloques
    for (let x = 0; x < data.bloques.length; x++) {
        // Si existe este bloque...
        if (data.bloques[x] != null) {
            // Buscamos y asignamos el turno con id que coincida (si no coincide "asigna" null)
            turno = (data as any).bloques[x].turnos.id(idTurno);

            // Si encontró el turno dentro de alguno de los bloques, lo devuelve
            if (turno !== null) {
                return turno;
            }
        }
    }
    // sobreturnos
    turno = data.sobreturnos.id(idTurno);
    if (turno !== null) {
        return turno;
    }
    return false;
}

export function getPosition(req, agenda, idTurno = null) {
    idTurno = idTurno || req.body.idTurno;
    let index = -1;
    let turnos;
    let position = { indexBloque: -1, indexTurno: -1 };
    // Loop en los bloques
    for (let x = 0; x < agenda.bloques.length; x++) {
        // Si existe este bloque...
        turnos = agenda.bloques[x].turnos;
        index = turnos.findIndex((t) => t._id.toString() === idTurno.toString());
        if (index > -1) {
            position.indexBloque = x;
            position.indexTurno = index;
        }
    }
    return position;
}

export function agregarAviso(req, agenda) {
    let profesionalId = req.body.profesionalId;
    let estado = req.body.estado;
    let fecha = new Date();

    let index = agenda.avisos.findIndex(item => String(item.profesionalId) === profesionalId);
    if (index < 0) {
        agenda.avisos.push({
            estado,
            profesionalId,
            fecha
        });
        return true;
    }
    return false;

}

export function getTurnoSiguiente(req, agenda, idTurno = null) {
    let position = getPosition(req, agenda, idTurno);
    let index = position.indexTurno;
    let turnos = [];
    if (position.indexBloque > -1) {
        turnos = agenda.bloques[position.indexBloque].turnos;
    }
    if ((index > -1) && (index < turnos.length - 1) && (turnos[index + 1].estado === 'turnoDoble')) {
        return turnos[index + 1];
    }
    return null;
}


export function combinarFechas(fecha1, fecha2) {
    if (fecha1 && fecha2) {
        let horas: number;
        let minutes: number;
        let auxiliar: Date;

        auxiliar = new Date(fecha1);
        horas = fecha2.getHours();
        minutes = fecha2.getMinutes();
        auxiliar.setHours(horas, minutes, 0, 0);
        return auxiliar;
    } else {
        return null;
    }
}

export function calcularContadoresTipoTurno(posBloque, posTurno, agenda) {

    let countBloques;
    let esHoy = false;
    // Ver si el día de la agenda coincide con el día de hoy
    if (agenda.horaInicio >= moment(new Date()).startOf('day').toDate() && agenda.horaInicio <= moment(new Date()).endOf('day').toDate()) {
        esHoy = true;
    }

    // Contadores de "delDia" y "programado" varían según si es el día de hoy o no
    // countBloques = {
    //     delDia: esHoy ? ((agenda.bloques[posBloque].accesoDirectoDelDia as number) + (agenda.bloques[posBloque].accesoDirectoProgramado as number)) : agenda.bloques[posBloque].accesoDirectoDelDia,
    //     programado: esHoy ? 0 : agenda.bloques[posBloque].accesoDirectoProgramado,
    //     gestion: agenda.bloques[posBloque].reservadoGestion,
    //     profesional: agenda.bloques[posBloque].reservadoProfesional
    // };

    countBloques = {
        delDia: esHoy ? (
            (agenda.bloques[posBloque].restantesDelDia as number) +
            (agenda.bloques[posBloque].restantesProgramados as number) +
            (agenda.bloques[posBloque].restantesGestion as number) +
            (agenda.bloques[posBloque].restantesProfesional as number)
        ) : agenda.bloques[posBloque].restantesDelDia,
        programado: esHoy ? 0 : agenda.bloques[posBloque].restantesProgramados,
        gestion: esHoy ? 0 : agenda.bloques[posBloque].restantesGestion,
        profesional: esHoy ? 0 : agenda.bloques[posBloque].restantesProfesional
    };

    // // Restamos los turnos asignados de a cuenta
    // if (agenda.bloques[posBloque].turnos[posTurno].estado === 'asignado') {
    //     if (esHoy) {
    //         switch (agenda.bloques[posBloque].turnos[posTurno].tipoTurno) {
    //             case ('delDia'):
    //                 countBloques.delDia--;
    //                 break;
    //             case ('programado'):
    //                 countBloques.delDia--;
    //                 break;
    //             case ('profesional'):
    //                 countBloques.profesional--;
    //                 break;
    //             case ('gestion'):
    //                 countBloques.gestion--;
    //                 break;
    //         }
    //     } else {
    //         switch (agenda.bloques[posBloque].turnos[posTurno].tipoTurno) {
    //             case ('programado'):
    //                 countBloques.programado--;
    //                 break;
    //             case ('profesional'):
    //                 countBloques.profesional--;
    //                 break;
    //             case ('gestion'):
    //                 countBloques.gestion--;
    //                 break;
    //         }
    //     }
    // }
    return countBloques;
}


// export function crearPrestacionVacia(turno, req) {

// }

// Dado un turno, se crea una prestacionPaciente
// export function crearPrestacionVacia(turno, req) {
//     let prestacion;
//     let nuevaPrestacion;
//     let pacienteTurno = turno.paciente;

//     pacienteTurno['_id'] = turno.paciente.id;
//     paciente.findById(pacienteTurno.id, (err, data) => {
//         nuevaPrestacion = {
//             paciente: data,
//             solicitud: {
//                 tipoPrestacion: turno.tipoPrestacion,
//                 fecha: new Date(),
//                 listaProblemas: [],
//                 idTurno: turno.id,
//             },
//             estado: {
//                 timestamp: new Date(),
//                 tipo: 'pendiente'
//             },
//             ejecucion: {
//                 fecha: new Date(),
//                 evoluciones: []
//             }
//         };
//         prestacion = new prestacionPaciente(nuevaPrestacion);

//         Auth.audit(prestacion, req);
//         prestacion.save();
//     });
// }

export function getBloque(agenda, turno) {
    for (let i = 0; i < agenda.bloques.length; i++) {
        let bloque = agenda.bloques[i];
        for (let j = 0; j < bloque.turnos.length; j++) {
            let turnoTemp = bloque.turnos[j];
            if (turnoTemp._id === turno._id) {
                return bloque;
            }
        }
    }
    return null;
}

export function actualizarAgendas() {
    let query;
    let hsActualizar = 48;
    let cantDias = hsActualizar / 24;
    let fechaActualizar = moment(new Date()).add(cantDias, 'days');
    let cantAccesoDirecto = 0;

    query = agendaModel.find({});
    query.where('estado').equals('publicada');
    // if (data.horaInicio >= moment(new Date()).startOf('day').toDate() && data.horaInicio <= moment(new Date()).endOf('day').toDate()) {
    query.where('horaInicio').gte(moment(fechaActualizar).startOf('day').toDate() as any);
    query.where('horaInicio').lte(moment(fechaActualizar).endOf('day').toDate() as any);
    query.exec((err, data) => {
        if (err) {
            return 'No se pudo actualizar las agendas';
        } else {
            if (data) {
                data.forEach(agenda => {
                    cantAccesoDirecto = agenda.accesoDirectoDelDia + agenda.accesoDirectoProgramado;
                    if (cantAccesoDirecto > 0) {
                        agenda.restanteProgramado = agenda.restanteProgramado + agenda.restantesGestion + agenda.restantesProfesional;
                    } else {
                        if (agenda.reservadoProfesional > 0) {
                            agenda.restantesGestion = agenda.restantesGestion + agenda.restantesProfesional;
                        }
                    }
                    agenda.save((error) => {
                        console.log('Error al actualizar agenda' + agenda.id, error);
                    });

                });
            }
        }
    });

}

