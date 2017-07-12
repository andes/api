import * as moment from 'moment';
import { prestacionPaciente } from './../../rup/schemas/prestacionPaciente';
import { paciente } from './../../../core/mpi/schemas/paciente';
import { Auth } from './../../../auth/auth.class';

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
export function liberarTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.estado = 'disponible';
    // delete turno.paciente;
    turno.paciente = null;
    turno.tipoPrestacion = null;
    turno.nota = null;

    let turnoDoble = getTurnoSiguiente(req, data, tid);
    if (turnoDoble) {
        turnoDoble.estado = 'disponible';
    }
}


// Turno
export function suspenderTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.estado = 'suspendido';
    delete turno.paciente;
    delete turno.tipoPrestacion;
    turno.motivoSuspension = req.body.motivoSuspension;
    // Se verifica si tiene un turno doble asociado
    let turnoDoble = getTurnoSiguiente(req, data, tid);
    if (turnoDoble) {
        turnoDoble.estado = 'suspendido';
        turnoDoble.motivoSuspension = req.body.motivoSuspension;
    }
    return data;
}

// // Turno
// function bloquearTurno(req, data, tid = null) {

//     let turno = getTurno(req, data, tid);

//     if (turno.estado !== 'suspendido') {
//         turno.estado = 'suspendido';
//     } else {
//         turno.estado = 'disponible';
//     }
// }

// // Turno
// function reasignarTurno(req, data, tid = null) {
//     let turno = getTurno(req, data, tid);
//     turno.estado = 'disponible';
//     delete turno.paciente;
//     turno.prestacion = null;
//     turno.motivoSuspension = null;
// }

// Turno
export function guardarNotaTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.nota = req.body.textoNota;
}

// Turno
export function darTurnoDoble(req, data, tid = null) {   //NUEVO
    let position = getPosition(req, data, tid);
    let agenda = data;
    if ((position.indexBloque > -1) && (position.indexTurno > -1)) {
        let turnoAnterior = agenda.bloques[position.indexBloque].turnos[position.indexTurno];

        // Verifico si existen turnos disponibles del tipo correspondiente
        let countBloques = calcularContadoresTipoTurno(position.indexBloque, position.indexTurno, agenda);
        if ((countBloques[turnoAnterior.tipoTurno] as number) === 0) {
            return ({
                err: 'No se puede asignar el turno doble ' + req.body.tipoTurno
            });
        } else {
            // se controla la disponibilidad de los tipos de turnos
            // el turno doble se otorgarpa si existe disponibilidad de la cantidad de tipo del turno asociado
            let turno = getTurno(req, data, tid);
            turno.estado = 'turnoDoble';
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
        data.bloques.forEach((bloque, index) => {
            bloque.accesoDirectoProgramado = bloque.accesoDirectoProgramado + bloque.reservadoProfesional;
            bloque.reservadoProfesional = 0;
        });
    }
    // Cuando se reanuda de un estado pausada, se setea el estado guardado en prePausa
    if (req.body.estado === 'prePausada') {
        data.estado = data.prePausada;
    } else {
        data.estado = req.body.estado;
    }
}

// Dada una Agenda completa + un id de Turno, busca y devuelve el Turno completo
export function getTurno(req, data, idTurno = null) {
    let turno;
    idTurno = idTurno || req.body.idTurno;
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
        index = turnos.findIndex((t) => { return t._id.toString() === idTurno.toString(); });
        if (index > -1) {
            position.indexBloque = x;
            position.indexTurno = index;
        }
    }
    return position;
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
    // Los siguientes 2 for ubican el indice del bloque y del turno
    let countBloques;
    let esHoy = false;
    // Ver si el día de la agenda coincide con el día de hoy
    if (agenda.horaInicio >= moment(new Date()).startOf('day').toDate() && agenda.horaInicio <= moment(new Date()).endOf('day').toDate()) {
        esHoy = true;
    }

    // Contadores de "delDia" y "programado" varían según si es el día de hoy o no
    countBloques = {
        delDia: esHoy ? ((agenda.bloques[posBloque].accesoDirectoDelDia as number) + (agenda.bloques[posBloque].accesoDirectoProgramado as number)) : agenda.bloques[posBloque].accesoDirectoDelDia,
        programado: esHoy ? 0 : agenda.bloques[posBloque].accesoDirectoProgramado,
        gestion: agenda.bloques[posBloque].reservadoGestion,
        profesional: agenda.bloques[posBloque].reservadoProfesional
    };

    // Restamos los turnos asignados de a cuenta
    if (agenda.bloques[posBloque].turnos[posTurno].estado === 'asignado') {
        if (esHoy) {
            switch (agenda.bloques[posBloque].turnos[posTurno].tipoTurno) {
                case ('delDia'):
                    countBloques.delDia--;
                    break;
                case ('programado'):
                    countBloques.delDia--;
                    break;
                case ('profesional'):
                    countBloques.profesional--;
                    break;
                case ('gestion'):
                    countBloques.gestion--;
                    break;
            }
        } else {
            switch (agenda.bloques[posBloque].turnos[posTurno].tipoTurno) {
                case ('programado'):
                    countBloques.programado--;
                    break;
                case ('profesional'):
                    countBloques.profesional--;
                    break;
                case ('gestion'):
                    countBloques.gestion--;
                    break;
            }
        }
    }
    return countBloques;
}

// Dado un turno, se crea una prestacionPaciente
export function crearPrestacionVacia(turno, req) {
    let prestacion;
    let nuevaPrestacion;
    let pacienteTurno = turno.paciente;

    pacienteTurno['_id'] = turno.paciente.id;
    paciente.findById(pacienteTurno.id, (err, data) => {
        nuevaPrestacion = {
            paciente: data,
            solicitud: {
                tipoPrestacion: turno.tipoPrestacion,
                fecha: new Date(),
                listaProblemas: [],
                idTurno: turno.id,
            },
            estado: {
                timestamp: new Date(),
                tipo: 'pendiente'
            },
            ejecucion: {
                fecha: new Date(),
                evoluciones: []
            }
        };
        prestacion = new prestacionPaciente(nuevaPrestacion);

        Auth.audit(prestacion, req);
        prestacion.save();
    });
}