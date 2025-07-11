import { EventCore } from '@andes/event-bus';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
import * as request from 'request';
import { Auth } from '../../../auth/auth.class';
import { diasNoLaborables, userScheduler } from '../../../config.private';
import { updateFinanciador, updateObraSocial } from '../../../core-v2/mpi/paciente/paciente.controller';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { SnomedCtr } from '../../../core/term/controller/snomed.controller';
import { toArray } from '../../../utils/utils';
import * as prestacionController from '../../rup/controllers/prestacion';
import { Prestacion } from '../../rup/schemas/prestacion';
import { Agenda, HistorialAgenda } from '../../turnos/schemas/agenda';
import { agendaLog } from '../citasLog';
import { SnomedCIE10Mapping } from './../../../core/term/controller/mapping';
import * as cie10 from './../../../core/term/schemas/cie10';
import { ECLQueriesCtr } from './../../../core/tm/eclqueries.routes';

export async function getAgendaById(agendaId) {
    return await Agenda.findById(agendaId);
}

// Turno
export function turnoSinAsignar(data, turnoBuscar) {
    const turnosTotal = data.bloques.flatMap(unBloque => unBloque.turnos).concat(data.sobreturnos);
    const encontrado = turnosTotal.find(unTurno => unTurno._id.toString() === turnoBuscar);
    if (encontrado && encontrado.estado !== 'turnoDoble' && !encontrado.paciente) {
        return true;
    }
    return false;
}

// Turno
export function darAsistencia(req, data, tid = null) {
    const turno = getTurno(req, data, tid);
    turno.asistencia = 'asistio';
    if (!turno.horaAsistencia) {
        if (moment(turno.horaInicio).format('YYYY-MM-DD') < moment().startOf('day').format('YYYY-MM-DD')) {
            turno.horaAsistencia = turno.horaInicio; // Para el caso donde se inicia una prestacion de un turno con fecha anterior a hoy
        } else {
            turno.horaAsistencia = new Date();
        }
    }

    turno.updatedAt = new Date();
    turno.updatedBy = req.user.usuario || req.user;
    return turno;
}

// Turno
export function sacarAsistencia(req, data, tid = null) {
    const turno = getTurno(req, data, tid);

    if (turno.horaAsistencia) {
        turno.horaAsistencia = null;
    }

    turno.asistencia = undefined;
    turno.updatedAt = new Date();
    turno.updatedBy = req.user.usuario || req.user;
    return turno;
}
// Turno
export function marcarNoAsistio(req, data, tid = null) {
    const turno = getTurno(req, data, tid);

    if (turno.horaAsistencia) {
        turno.horaAsistencia = null;
    }

    turno.asistencia = 'noAsistio';
    turno.updatedAt = new Date();
    turno.updatedBy = req.user.usuario || req.user;
    return turno;
}

// Turno
export function quitarTurnoDoble(req, data, tid = null) {
    const turno = getTurno(req, data, tid);
    turno.estado = 'disponible';
    turno.updatedAt = new Date();
    turno.updatedBy = req.user.usuario || req.user;
    const turnoOriginal = getTurnoAnterior(req, data, turno._id);
    const position = getPosition(req, data, turnoOriginal._id);
    switch (turnoOriginal.tipoTurno) {
        case ('delDia'):
            data.bloques[position.indexBloque].restantesDelDia = data.bloques[position.indexBloque].restantesDelDia + 1;
            data.bloques[position.indexBloque].restantesProgramados = 0;
            data.bloques[position.indexBloque].restantesProfesional = 0;
            data.bloques[position.indexBloque].restantesGestion = 0;
            break;
        case ('programado'):
            data.bloques[position.indexBloque].restantesProgramados = data.bloques[position.indexBloque].restantesProgramados + 1;
            break;
        case ('profesional'):
            data.bloques[position.indexBloque].restantesProfesional = data.bloques[position.indexBloque].restantesProfesional + 1;
            break;
        case ('gestion'):
            data.bloques[position.indexBloque].restantesGestion = data.bloques[position.indexBloque].restantesGestion + 1;
            break;
    }
}


// Turno y sobreturno
export async function liberarTurno(req, data, turno) {
    const position = getPosition(req, data, turno._id);
    const enEjecucion = await prestacionController.enEjecucion(turno);
    if (enEjecucion) {
        return false;
    }
    if (req.body.sobreturno) { // Liberación de sobreturno
        const index = data.sobreturnos.findIndex(st => st._id.toString() === turno._id.toString());
        if (index === -1) { // En caso de que el sobreturno no exista o ya fue eliminado de la agenda.
            return false;
        }
        data.sobreturnos.splice(index, 1);
    } else { // Liberación de turno
        if (!data.dinamica) {
            turno.estado = 'disponible';
            turno.paciente = null;
            turno.tipoPrestacion = null;
            turno.nota = null;
            turno.confirmedAt = null;
            turno.reasignado = undefined; // Esto es necesario cuando se libera un turno reasignado
            turno.updatedAt = new Date();
            turno.updatedBy = req.user.usuario || req.user;
            let cant = 1;

            const turnoDoble = getTurnoSiguiente(req, data, turno._id);
            if (turnoDoble) {
                cant = cant + 1;
                turnoDoble.estado = 'disponible';
                turnoDoble.updatedAt = new Date();
                turnoDoble.updatedBy = req.user.usuario || req.user;
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
                    if (this.esVirtual(turno.emitidoPor)) {
                        data.bloques[position.indexBloque].restantesMobile = data.bloques[position.indexBloque].restantesMobile + cant;
                    }
                    turno.emitidoPor = ''; // Blanqueamos el emitido por (VER SI LO DEJAMOS O LO BLANQUEAMOS CUANDO EL PACIENTE LO ELIMINA)
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
            const fechaActualizar = moment().startOf('day').add(2, 'days');
            // actualizamos turnos de la agenda si la hora de inicio esta dentro de las proxmas 48hs
            if (moment(data.horaInicio).isBefore(fechaActualizar)) {
                data = this.actualizarTurnos(data);
            }

        } else {
            if (data.cupo > -1) {
                data.cupo++;
            }
            const newTurnos = data.bloques[position.indexBloque].turnos;
            newTurnos.splice(position.indexTurno, 1);
            data.bloques[position.indexBloque].turnos = newTurnos;
        }
    }
    return true;
}


// Turno
export function suspenderTurno(req, data, turno) {
    if (turno.estado !== 'turnoDoble') {
        turno.estado = 'suspendido';
    }
    const datosTurno = turno;
    const efector = data.organizacion;
    delete turno.paciente;
    delete turno.tipoPrestacion;
    turno.motivoSuspension = req.body.motivoSuspension;
    turno.avisoSuspension = req.body.avisoSuspension;
    turno.updatedAt = new Date();
    turno.updatedBy = req.user.usuario || req.user;


    let cant = 1;
    // Se verifica si tiene un turno doble asociado
    const turnoDoble = getTurnoSiguiente(req, data, turno._id);
    if (turnoDoble) {
        cant = cant + 1;
        // Se deja el estado turnoDoble para detectar este caso en la reasignacion
        // turnoDoble.estado = 'suspendido';
        turnoDoble.motivoSuspension = req.body.motivoSuspension;
        turnoDoble.updatedAt = new Date();
        turnoDoble.updatedBy = req.user.usuario || req.user;
    }

    // Chequeamos si es sobreturno
    if (!(data.sobreturnos && data.sobreturnos.length > 0)) {
        // El tipo de turno del cual se resta será en el orden : delDia, programado, autocitado, gestion
        const position = getPosition(req, data, turno._id);
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
    // NotificationService.notificarSuspension(datosTurno, efector);
}

// Turno
export async function codificarTurno(req, data, tid, pid = null) {
    const turno = getTurno(req, data[0], tid);
    let conditions = {};

    if (pid) {
        conditions = { _id: pid };
    } else {
        conditions = {
            'estadoActual.tipo': 'validada',
            'solicitud.turno': tid
        };
    }
    const arrPrestaciones = await Prestacion.find(conditions);

    if (!arrPrestaciones.length) {
        return turno;
    }

    const codificaciones = [];
    let registros = [];

    arrPrestaciones.forEach((unaPrestacion: any) => {
        const presta = unaPrestacion.ejecucion.registros.filter(f =>
            f.concepto.semanticTag !== 'elemento de registro'
        );
        registros = [...registros, ...presta];
    });

    if (arrPrestaciones.length && registros.length) {
        for (const registro of registros) {
            const parametros = {
                conceptId: registro.concepto.conceptId,
                paciente: turno.paciente,
                secondaryConcepts: registros.map(r => r.concepto.conceptId)
            };

            const map = new SnomedCIE10Mapping(parametros.paciente, parametros.secondaryConcepts);
            let codigoCie10: any = {
                codigo: 'Mapeo no disponible'
            };
            const target = await map.transform(parametros.conceptId);
            if (target) {
                const cie = await cie10.model.findOne({
                    codigo: (target as String).substring(0, 5)
                });
                if (cie != null) {
                    codigoCie10 = {
                        causa: (cie as any).causa,
                        subcausa: (cie as any).subcausa,
                        codigo: (cie as any).codigo,
                        nombre: (cie as any).nombre,
                        sinonimo: (cie as any).sinonimo,
                        c2: (cie as any).c2,
                        reporteC2: (cie as any).reporteC2,
                        ficha: (cie as any).ficha
                    };
                }
            }
            if (registro.esDiagnosticoPrincipal) {
                codificaciones.unshift({ // El diagnostico principal se inserta al comienzo del array
                    codificacionProfesional: {
                        snomed: {
                            conceptId: registro.concepto.conceptId,
                            term: registro.concepto.term,
                            fsn: registro.concepto.fsn,
                            semanticTag: registro.concepto.semanticTag
                        },
                        cie10: codigoCie10
                    },
                    primeraVez: registro.esPrimeraVez,
                });

            } else {
                codificaciones.push({
                    codificacionProfesional: {
                        snomed: {
                            conceptId: registro.concepto.conceptId,
                            term: registro.concepto.term,
                            fsn: registro.concepto.fsn,
                            semanticTag: registro.concepto.semanticTag
                        },
                        cie10: codigoCie10
                    },
                    primeraVez: registro.esPrimeraVez
                });
            }
        }
    }
    turno.diagnostico = {
        ilegible: false,
        codificaciones: codificaciones.filter(cod => Object.keys(cod).length > 0)
    };
    turno.asistencia = 'asistio';
    return turno;
}

// Turno
export function guardarNotaTurno(req, data, tid = null) {
    const turno = getTurno(req, data, tid);
    turno.nota = req.body.textoNota;
    turno.updatedAt = new Date();
    turno.updatedBy = req.user.usuario || req.user;
}

// Turno
export function darTurnoDoble(req, data, tid = null) { // NUEVO
    const position = getPosition(req, data, tid); // Obtiene la posición actual del turno seleccionado
    const agenda = data;
    let turnoAnterior;

    if ((position.indexBloque > -1) && (position.indexTurno > -1)) {
        turnoAnterior = agenda.bloques[position.indexBloque].turnos[position.indexTurno - 1]; // Obtiene el turno anterior

        // Verifico si existen turnos disponibles del tipo correspondiente
        const countBloques = calcularContadoresTipoTurno(position.indexBloque, position.indexTurno, agenda);
        if ((countBloques[turnoAnterior.tipoTurno] as number) === 0) {
            return ({
                err: 'No se puede asignar el turno doble ' + turnoAnterior.tipoTurno
            });
        } else {
            // se controla la disponibilidad de los tipos de turnos
            // el turno doble se otorgara si existe disponibilidad de la cantidad de tipo del turno asociado
            const turno = getTurno(req, data, tid);
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
            return null; // jfgabriel | Revisar esta línea! La agregué porque el compilador tiraba un error TS7030: Not all code paths return a value.
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
    // Para que setee el atributo en null segun corresponda
    data.espacioFisico = req.body.espacioFisico;
    data.otroEspacioFisico = req.body.otroEspacioFisico;
    // Si se desactivaron los mensajes al dar turno
    data.enviarSms = req.body.enviarSms || false;
}

export async function actualizarPaciente(pacienteTurno: any, req: any) {
    const pacienteMPI = await PacienteCtr.findById(pacienteTurno.id) as any;
    const obraSocialUpdated = await updateObraSocial(pacienteMPI);
    const financiador = updateFinanciador(obraSocialUpdated, pacienteTurno.obraSocial);

    return await PacienteCtr.update(pacienteTurno.id, { ...pacienteTurno, financiador }, req);
}

// Agenda
export async function agregarSobreturno(req, data) {
    const sobreturno = req.body.sobreturno;
    if (sobreturno) {
        const usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);

        await this.actualizarPaciente(sobreturno.paciente, req);

        // Copia la organización desde el token
        usuario.organizacion = (req as any).user.organizacion;
        sobreturno.updatedAt = new Date();
        sobreturno.updatedBy = usuario;
        data.sobreturnos.push(sobreturno);
        return data.sobreturnos[data.sobreturnos.length - 1]; // Para poder trackear el id del sobreturno
    }
}

function actualizarHistorial(elem, agenda, req) {
    const itemHistorial = new HistorialAgenda(elem);

    Auth.audit(itemHistorial, req);
    agenda.historial.push(itemHistorial);
}

// Agenda
export function actualizarEstado(req, data) {

    // Si se pasa a estado Pausada, guardamos el estado previo
    if (req.body.estado === 'pausada') {
        data.prePausada = data.estado;
    }

    // Si se pasa a publicada
    if (req.body.estado === 'publicada') {
        const hoy = new Date();
        data.estado = 'publicada';
        if (moment(data.horaInicio).isSame(hoy, 'day')) {
            data.bloques.forEach(bloque => {
                if (bloque.restantesProgramados > 0) {
                    bloque.restantesDelDia += bloque.restantesProgramados;
                    bloque.restantesProgramados = 0;
                }
            });
        }
        // Si se esta publicando una agenda de hoy o mañana se pasan los turnos igual q en job
        const tomorrow = moment(new Date()).add(1, 'days');
        if (moment(data.horaInicio).isSame(hoy, 'day') || moment(data.horaInicio).isSame(tomorrow, 'day')) {
            for (let j = 0; j < data.bloques.length; j++) {
                const cantAccesoDirecto = data.bloques[j].accesoDirectoDelDia + data.bloques[j].accesoDirectoProgramado;
                if (cantAccesoDirecto > 0) {
                    data.bloques[j].restantesProgramados = data.bloques[j].restantesProgramados + data.bloques[j].restantesGestion + data.bloques[j].restantesProfesional;
                    data.bloques[j].restantesGestion = 0;
                    data.bloques[j].restantesProfesional = 0;
                } else {
                    if (data.bloques[j].reservadoProfesional > 0) {
                        data.bloques[j].restantesGestion = data.bloques[j].restantesGestion + data.bloques[j].restantesProfesional;
                        data.bloques[j].restantesProfesional = 0;
                    }
                }
            }
        }
    }

    // Si se pasa a borrada
    if (req.body.estado === 'borrada') {
        data.estado = 'borrada';
    }

    // Cuando se reanuda de un estado pausada, se setea el estado guardado en prePausa
    if (req.body.estado === 'prePausada') {
        data.estado = data.prePausada;
    } else {
        data.estado = req.body.estado;
        // Si se suspende una agenda, hay que enviar SMS a todos los pacientes
        if (req.body.estado === 'suspendida') {

            data.motivoDeSuspension = req.body.motivo;
            data.bloques.forEach(bloque => {
                bloque.turnos.forEach(turno => {
                    if (turno.estado !== 'turnoDoble') {
                        turno.estado = 'suspendido';
                    }
                    turno.motivoSuspension = 'agendaSuspendida';
                    turno.avisoSuspension = 'no enviado';
                });
            });
            data.sobreturnos.forEach(sobreturno => {
                if (sobreturno.estado !== 'turnoDoble') {
                    sobreturno.estado = 'suspendido';
                }
                sobreturno.motivoSuspension = 'agendaSuspendida';
                sobreturno.avisoSuspension = 'no enviado';
            });
        }
    }

    actualizarHistorial({ estado: req.body.estado }, data, req);
}

// Dada una Agenda completa + un id de Turno, busca y devuelve el Turno completo
export function getTurno(req, data, idTurno = null) {
    let turno;
    idTurno = String(idTurno) || req.body.idTurno;

    // Loop en los bloques
    if (data && data.bloques) {
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
    }
    // sobreturnos
    if (data && data.sobreturnos) {
        turno = data.sobreturnos.id(idTurno);
        if (turno !== null) {
            return turno;
        }
    }
    return false;
}

export function getPosition(req, agenda, idTurno = null) {
    idTurno = idTurno || req.body.idTurno;
    let index = -1;
    let turnos;
    const position = { indexBloque: -1, indexTurno: -1 };
    // Loop en los bloques
    for (let x = 0; x < agenda.bloques.length; x++) {
        // Si existe este bloque...
        turnos = agenda.bloques[x].turnos;
        index = turnos?.findIndex((t) => t._id?.toString() === idTurno?.toString());
        if (index > -1) {
            position.indexBloque = x;
            position.indexTurno = index;
        }
    }
    return position;
}

export function agregarAviso(req, agenda) {
    const profesionalId = req.body.profesionalId;
    const estado = req.body.estado;
    const fecha = new Date();

    const index = agenda.avisos.findIndex(item => String(item.profesionalId) === profesionalId);
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
    const position = getPosition(req, agenda, idTurno);
    const index = position.indexTurno;
    let turnos = [];
    if (position.indexBloque > -1) {
        turnos = agenda.bloques[position.indexBloque].turnos;
    }
    if ((index > -1) && (index < turnos.length - 1) && (turnos[index + 1].estado === 'turnoDoble')) {
        return turnos[index + 1];
    }
    return null;
}

export function getTurnoAnterior(req, agenda, idTurno = null) {
    const position = getPosition(req, agenda, idTurno);
    const index = position.indexTurno;
    let turnos = [];
    if (position.indexBloque > -1) {
        turnos = agenda.bloques[position.indexBloque].turnos;
    }
    return turnos[index - 1];
}


export function combinarFechas(fecha1, fecha2) {
    if (fecha1 && fecha2) {
        const auxiliar = new Date(fecha1);
        const horas = fecha2.getHours();
        const minutes = fecha2.getMinutes();
        auxiliar.setHours(horas, minutes, 0, 0);
        return auxiliar;
    } else {
        return null;
    }
}

export function calcularContadoresTipoTurno(posBloque, posTurno, agenda) {


    let esHoy = false;
    // Ver si el día de la agenda coincide con el día de hoy
    if (agenda.horaInicio >= moment(new Date()).startOf('day').toDate() && agenda.horaInicio <= moment(new Date()).endOf('day').toDate()) {
        esHoy = true;
    }

    const countBloques = {
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

    return countBloques;
}

export function getBloque(agenda, turno) {
    for (let i = 0; i < agenda.bloques.length; i++) {
        const bloque = agenda.bloques[i];
        for (let j = 0; j < bloque.turnos.length; j++) {
            const turnoTemp = bloque.turnos[j];
            if (turnoTemp._id === turno._id) {
                return bloque;
            }
        }
    }
    return null;
}

export function esPrimerPaciente(agenda: any, idPaciente: string, opciones: any[]) {
    return new Promise<any>((resolve, reject) => {
        const prestacionActual = 'Exámen médico del adulto';
        const profesionalesActuales = ['58f9eae202e4a0f31fcbd846'];

        let primerPrestacion = false;
        let primerProfesional = false;

        agenda.find({}, (err, agendas) => {
            if (err) {
                return err;
            }
            agendas.forEach((ag, iAg) => {
                ag.bloques.forEach((bl, iBl) => {
                    bl.turnos.forEach((tu, iTu) => {
                        if (tu.paciente && tu.paciente.id && tu.paciente.id.toString() === '59834a503ff831451edc5739'.toString()) {
                            primerPrestacion = bl.tipoPrestaciones.map(x => {
                                return x.term === prestacionActual ? true : false;
                            });
                            primerProfesional = ag.profesionales.map(pr => {
                                return profesionalesActuales.find((f, index) => {
                                    return pr._id.toString() === f.toString();
                                });
                            }).length === 0;
                        }
                    });
                });
            });
        });
        resolve({
            profesional: primerProfesional,
            tipoPrestacion: primerPrestacion
        });
    });

}

function esFeriado(fecha) {
    return new Promise((resolve, reject) => {

        const anio = moment(fecha).year();
        const mes = moment(fecha).month(); // de 0 a 11
        const dia = moment(fecha).date(); // de 1 a 31
        const url = diasNoLaborables + anio;

        request({ url, json: true }, (err, response, body) => {
            if (err) {
                reject(err);
            }
            if (body) {
                const feriados = body.filter(item => {
                    return ((item.mes).toString() === (mes + 1).toString() && (item.dia).toString() === (dia).toString());
                });
                if (feriados.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        });
    });
}

/**
 * Recupera las agendas a 48hs de la fecha actual y actualiza la cantidad de turnos restantes antes
 * de su fecha de inicio. Se ejecuta una vez al día por el scheduler.
 *
 * @export actualizarTiposDeTurno()
 * @returns resultado
 */
export async function actualizarTiposDeTurno() {
    const hsActualizar = 48;
    const cantDias = hsActualizar / 24;
    let fechaActualizar = moment(new Date()).add(cantDias, 'days');
    const esDomingo = false;
    let feriado;
    let agenda = null;
    let condicion = {};
    try {
        feriado = await esFeriado(fechaActualizar);
        while ((feriado && !esDomingo) || (moment(fechaActualizar).day().toString() === '6')) {
            switch (moment(fechaActualizar).day().toString()) {
                case '0':
                    this.esDomingo = true;
                    break;
                case '6':
                    fechaActualizar = moment(fechaActualizar).add(2, 'days');
                    break;
                default:
                    fechaActualizar = moment(fechaActualizar).add(1, 'days');
                    break;
            }
            feriado = await esFeriado(fechaActualizar);
        }
    } catch (error) {
        agendaLog.error('actualizarTiposTurnos', { feriado, fechaActualizar }, error);
        return null;
    }

    // actualiza los turnos restantes de las agendas 2 dias antes de su horaInicio.
    condicion = {
        estado: 'publicada',
        horaInicio: {
            $gte: (moment(fechaActualizar).startOf('day').toDate() as any),
            $lte: (moment(fechaActualizar).endOf('day').toDate() as any)
        }
    };
    const cursor = Agenda.find(condicion).cursor();
    return cursor.eachAsync(async doc => {
        try {
            const data = this.actualizarTurnos(doc);
            agenda = data.agenda;
            Auth.audit(agenda, (userScheduler as any));
            await agenda.save();
            const objetoLog = {
                idAgenda: agenda._id,
                organizacion: agenda.organizacion,
                horaInicio: agenda.horaInicio,
                updatedAt: agenda.updatedAt,
                updatedBy: agenda.updatedBy,
                bloques: data.logs
            };
            agendaLog.info('actualizarTiposTurnos', objetoLog);
        } catch (error) {
            agendaLog.error('actualizarTiposTurnos', { queryAgendas: condicion, agenda }, error);
        }
    });
}

/**
 * Método auxiliar para registrar los logs.
 *
 */
function registrarLog(logs, bloque, estado, datos) {
    logs.push({
        bloque,
        idBloque: datos._id,
        estado,
        restantesDelDia: datos.restantesDelDia,
        restantesProgramados: datos.restantesProgramados,
        restantesProfesional: datos.restantesProfesional,
        restantesMobile: datos.restantesMobile,
        restantesGestion: datos.restantesGestion,
    });
}

// Dada una agenda, actualiza los turnos restantes (Para agendas dentro de las 48hs a partir de hoy).
export function actualizarTurnos(agenda) {
    const logs = [];

    for (let j = 0; j < agenda.bloques.length; j++) {
        registrarLog(logs, j, 'inicio', agenda.bloques[j]);

        const cantAccesoDirecto = agenda.bloques[j].accesoDirectoDelDia + agenda.bloques[j].accesoDirectoProgramado;

        if (cantAccesoDirecto > 0) {
            agenda.bloques[j].restantesProgramados = agenda.bloques[j].restantesProgramados + agenda.bloques[j].restantesGestion + agenda.bloques[j].restantesProfesional;
            agenda.bloques[j].restantesGestion = 0;
            agenda.bloques[j].restantesProfesional = 0;
        } else {
            if (agenda.bloques[j].reservadoProfesional > 0) {
                agenda.bloques[j].restantesGestion = agenda.bloques[j].restantesGestion + agenda.bloques[j].restantesProfesional;
                agenda.bloques[j].restantesProfesional = 0;
            }
        }

        registrarLog(logs, j, 'final', agenda.bloques[j]);
    }
    return { agenda, logs };
}


/**
 * Actualiza los estados de las agendas que se ejecutaron el día anterior a Pendiente Asistencia o
 * Pendiente Auditoría según corresponda
 * se ejecuta una vez al día por el scheduler.
 *
 * @export actualizarEstadoAgendas()
 * @param {any} start
 * @param {any} end
 * @returns resultado
 */
export function actualizarEstadoAgendas(start, end) {
    // actualiza los agendas en estado pausada, disponible o publicada que se hayan ejecutado entre las fechas start y end
    const condicion = {
        $or: [{ estado: 'disponible' }, { estado: 'publicada' }, { estado: 'pausada' }, { estado: 'pendienteAsistencia' }, { estado: 'pendienteAuditoria' }],
        $and: [
            { horaInicio: { $gte: start } },
            { horaInicio: { $lte: end } }
        ]
    };
    const cursor = Agenda.find(condicion).cursor();
    return cursor.eachAsync(doc => {
        const agenda: any = doc;
        let turnos = [];
        let todosAsistencia = false;
        let todosAuditados = false;
        try {
            for (let j = 0; j < agenda.bloques.length; j++) {
                turnos = turnos.concat(agenda.bloques[j].turnos);
            }
            if (agenda.sobreturnos) {
                turnos = turnos.concat(agenda.sobreturnos);
            }
            todosAsistencia = !turnos.some(t => t.estado === 'asignado' && !(t.asistencia));
            todosAuditados = !(turnos.some(t => t.asistencia === 'asistio' && (!t.diagnostico.codificaciones[0] || (t.diagnostico.codificaciones[0] && !t.diagnostico.codificaciones[0].codificacionAuditoria))));

            if (agenda.nominalizada) {
                if (todosAsistencia) {
                    if (todosAuditados) {
                        agenda.estado = 'auditada';
                        actualizarAux(agenda);
                    } else {
                        if (agenda.estado !== 'pendienteAuditoria') {
                            agenda.estado = 'pendienteAuditoria';
                            actualizarAux(agenda);
                        }
                    }
                } else {
                    if (agenda.estado !== 'pendienteAsistencia') {
                        agenda.estado = 'pendienteAsistencia';
                        actualizarAux(agenda);
                    }
                }

                actualizarHistorial({ estado: agenda.estado }, agenda, (userScheduler as any));
            }
        } catch (error) {
            agendaLog.error('actualizarEstadoAgendas', { agenda }, error);
        }
    });
}

export async function prestacionesDisponibles(params) {
    let pipelinePrestaciones = [];
    pipelinePrestaciones = [
        {
            $match: {
                'organizacion._id': {
                    $eq: new mongoose.Types.ObjectId(Auth.getOrganization(params))
                },
                'bloques.turnos.horaInicio': { $gte: new Date(moment().format('YYYY-MM-DD HH:mm')) },
                estado: 'publicada',
                dinamica: false,
                'bloques.restantesMobile': {
                    $gt: 0
                }
            }
        },
        {
            $unwind: '$bloques'
        },
        {
            $match: {
                'bloques.restantesMobile': {
                    $gt: 0
                }
            }
        },
        {
            $project: {
                prestaciones: '$bloques.tipoPrestaciones',
                _id: 0
            }
        },
        {
            $unwind: '$prestaciones'
        },
        {
            $group: {
                _id: {
                    conceptId: '$prestaciones.conceptId',
                },
                resultado: { $push: '$$ROOT' }
            }
        },
        {
            $project: {
                resultado: {
                    $arrayElemAt: ['$resultado', 0]
                },
                _id: 0
            }
        },
        {
            $unwind: '$resultado'
        },
        {
            $project: {
                _id: '$resultado.prestaciones._id',
                conceptId: '$resultado.prestaciones.conceptId',
                fsn: '$resultado.prestaciones.fsn',
                semanticTag: '$resultado.prestaciones.semanticTag',
                term: '$resultado.prestaciones.term'
            }
        }

    ];
    const prestaciones = await Agenda.aggregate(pipelinePrestaciones);
    return prestaciones;
}

// agendas con el primer turno disponible agrupadas por profesional
export async function turnosDisponibles(prestacion, organizacion) {
    let pipelineAgendas = [];
    pipelineAgendas = [

        {
            $match: {
                'organizacion._id': {
                    $eq: organizacion
                },
                'bloques.turnos.horaInicio': { $gte: new Date(moment().format('YYYY-MM-DD HH:mm')) },
                estado: 'publicada',
                'tipoPrestaciones.conceptId': prestacion,
                'bloques.restantesMobile': {
                    $gt: 0
                }
            }
        },
        {
            $unwind: '$bloques'
        },
        {
            $match: {
                'bloques.restantesMobile': {
                    $gt: 0
                }
            }
        },
        {
            $unwind: '$bloques.tipoPrestaciones'
        },
        {
            $unwind: '$bloques'
        },
        {
            $unwind: '$bloques.turnos'
        },
        {
            $match: {
                'bloques.tipoPrestaciones.conceptId': prestacion
            }
        },
        {
            $match: {
                'bloques.turnos.estado': 'disponible'
            }
        },
        {
            $sort: {
                'bloques.turnos.horaInicio': 1
            }
        },
        {
            $group: {
                _id: '$profesionales',
                resultado: {
                    $push: '$$ROOT'
                }
            }
        },
        {
            $project: {
                resultado: {
                    $arrayElemAt: ['$resultado', 0]
                },
                _id: 0
            }
        }
    ];
    const agendas = await Agenda.aggregate(pipelineAgendas);
    return agendas;

}

async function actualizarAux(agenda: any) {
    Auth.audit(agenda, (userScheduler as any));
    await saveAgenda(agenda);
    const objetoLog = {
        idAgenda: agenda._id,
        organizacion: agenda.organizacion,
        horaInicio: agenda.horaInicio,
        updatedAt: agenda.updatedAt,
        updatedBy: agenda.updatedBy
    };
    agendaLog.info('actualizarEstadoAgendas', objetoLog);
}


/**
 * Llegado el día de ejecucion de la agenda, los turnos restantesProgramados pasan a restantesDelDia
 *
 * @export actualizarTurnosDelDia()
 * @returns resultado
 */
export function actualizarTurnosDelDia() {
    const fechaActualizar = moment();

    const condicion = {
        $or: [{ estado: 'disponible' }, { estado: 'publicada' }],
        horaInicio: {
            $gte: (moment(fechaActualizar).startOf('day').toDate() as any),
            $lte: (moment(fechaActualizar).endOf('day').toDate() as any)
        }
    };
    const cursor = Agenda.find(condicion).cursor();
    return cursor.eachAsync(doc => {
        const agenda: any = doc;
        for (let j = 0; j < agenda.bloques.length; j++) {
            if (agenda.bloques[j].restantesProgramados > 0) {
                agenda.bloques[j].restantesDelDia += agenda.bloques[j].restantesProgramados;
                agenda.bloques[j].restantesProgramados = 0;
            }
        }

        Auth.audit(agenda, (userScheduler as any));
        return saveAgenda(agenda).then(() => {
            const objetoLog = {
                idAgenda: agenda._id,
                organizacion: agenda.organizacion,
                horaInicio: agenda.horaInicio,
                updatedAt: agenda.updatedAt,
                updatedBy: agenda.updatedBy
            };
            agendaLog.info('actualizarTurnosDelDia', objetoLog);
            return Promise.resolve();
        }).catch(() => {
            return Promise.resolve();
        });

    });
}

/**
 * El dia anterior a la ejecución de la agenda (a las 12 del mediodía), los turnos restantes mobile se setean a 0
 *
 * @export actualizarTurnosMobile()
 * @returns resultado
 */
export function actualizarTurnosMobile() {
    const fechaActualizar = moment().add(1, 'day');

    const condicion = {
        $or: [{ estado: 'disponible' }, { estado: 'publicada' }, { estado: 'pausada' }],
        horaInicio: {
            $gte: (moment(fechaActualizar).startOf('day').toDate() as any),
            $lte: (moment(fechaActualizar).endOf('day').toDate() as any)
        },
        'bloques.restantesMobile': { $gt: 0 }
    };
    const cursor = Agenda.find(condicion).cursor();

    return cursor.eachAsync(async doc => {
        const agenda: any = doc;
        try {
            for (let j = 0; j < agenda.bloques.length; j++) {
                if (agenda.bloques[j].restantesMobile > 0) {
                    agenda.bloques[j].restantesMobile = 0;
                }
            }
            Auth.audit(agenda, (userScheduler as any));
            await saveAgenda(agenda);
        } catch (err) {
            agendaLog.error('actualizarTurnosMobile', { operacion: 'setea a 0 turnos disponibles para app mobile', agenda }, err);
        }
    });
}

/**
 * Realiza el save de una agenda.
 * El log del cambio debe guardarse luego de ejecutarse esta promise
 *
 * @export
 * @param {any} nuevaAgenda
 * @returns
 */
export function saveAgenda(nuevaAgenda) {
    return new Promise((resolve, reject) => {
        nuevaAgenda.save((err, dataAgenda) => {
            if (err) {
                reject(err);
            }
            if (dataAgenda) {
                resolve(dataAgenda);
            }
        });
    });
}


// Audita una agenda si es no nominalizada, si se realizo una validación de la prestación
EventCore.on('rup:prestacion:validate', async (prestacion) => {
    const noNominalizada = prestacion.solicitud.tipoPrestacion.noNominalizada;
    const idTurno = prestacion.solicitud.turno;
    if (noNominalizada && idTurno) {
        const agenda: any = await Agenda.findOne({ 'bloques.turnos._id': idTurno });
        if (agenda) {
            agenda.estado = 'auditada';
            const user = Auth.getUserFromResource(prestacion);
            Auth.audit(agenda, user as any);
            await saveAgenda(agenda);
        }
    }
});

// Marcar asistencia si la prestacion es no nominalizada
EventCore.on('rup:prestacion:validate', async (prestacion) => {
    const idTurno = prestacion.solicitud.turno;
    if (!prestacion.solicitud.tipoPrestacion.noNominalizada && idTurno) {
        try {
            const agenda: any = await Agenda.findOne({ $or: [{ 'bloques.turnos._id': { $eq: idTurno, $exists: true } }, { 'sobreturnos._id': { $eq: idTurno, $exists: true } }] });
            const noAsistionConceptos = await getConceptosNoAsistio();

            const filtroRegistros = prestacion.ejecucion.registros.filter(x => noAsistionConceptos.find(y => y.conceptId === x.concepto.conceptId));
            let turno, event;
            const user = Auth.getUserFromResource(prestacion);

            if (filtroRegistros && filtroRegistros.length > 0) {
                turno = marcarNoAsistio(user, agenda, idTurno);
                event = { object: 'turno', accion: 'asistencia', data: turno };
            } else {
                turno = darAsistencia(user, agenda, idTurno);
                const turCodi = await codificarTurno(user, [agenda], prestacion.solicitud.turno, prestacion._id);
                turno.diagnostico = turCodi.diagnostico;
                event = { object: 'turno', accion: 'asistencia', data: turno };
            }

            Auth.audit(agenda, user as any);
            await agenda.save();
            EventCore.emitAsync('citas:agenda:update', agenda);
            if (event.data) {
                EventCore.emitAsync(`citas:${event.object}:${event.accion}`, event.data);
            }
        } catch (err) {
            const data = {
                turno: idTurno,
                paciente: prestacion.paciente.id,
                prestacion: prestacion.id,
                organizacion: {
                    id: prestacion.solicitud.organizacion.id,
                    nombre: prestacion.solicitud.organizacion.nombre
                }
            };
            agendaLog.error('Error validando prestación', data, err, userScheduler);
        }
    }
});

export async function saveTurnoProfesional(turnoId, profesionalId) {
    const agenda: any = await findByTurnoId(turnoId);
    if (agenda) {
        const turno = getTurno(null, agenda, turnoId);
        if (turno) {
            turno.profesional = profesionalId;
            await Agenda.findByIdAndUpdate(agenda.id, agenda);
        }
    }
}

export function findByTurnoId(turnoId) {
    return Agenda.findOne({
        $or: [{
            'bloques.turnos._id': turnoId
        }, {
            'sobreturnos._id': turnoId
        }]
    });
}

async function getConceptosNoAsistio() {
    const expression = await ECLQueriesCtr.findOne({
        key: 'turnos:noasistio'
    });
    const form = 'stated';
    const languageCode = 'es';
    return SnomedCtr.getConceptByExpression(expression.valor, null, form, languageCode);
}

/**
 * Actualiza el paciente embebido en el turno.
 *
 * @export
 * @param {any} pacienteModified
 * @param {any} turno
 */
export function updatePaciente(pacienteModified, turno) {
    Agenda.findById(turno.agenda_id, (err, data, next) => {
        if (err) {
            return next(err);
        }
        const bloques: any = data.bloques;
        let indiceTurno = -1;
        let i = 0;
        while (indiceTurno < 0 && i < bloques.length) {
            indiceTurno = bloques[i].turnos.findIndex(elem => elem._id.toString() === turno._id.toString());

            if (indiceTurno > -1) { // encontro el turno en este bloque?
                bloques[i].turnos[indiceTurno].paciente.nombre = pacienteModified.nombre;
                bloques[i].turnos[indiceTurno].paciente.apellido = pacienteModified.apellido;
                bloques[i].turnos[indiceTurno].paciente.documento = pacienteModified.documento;
                if (pacienteModified.contacto && pacienteModified.contacto[0]) {
                    bloques[i].turnos[indiceTurno].paciente.telefono = pacienteModified.contacto[0].valor;
                }
                bloques[i].turnos[indiceTurno].paciente.carpetaEfectores = pacienteModified.carpetaEfectores;
                bloques[i].turnos[indiceTurno].paciente.fechaNacimiento = pacienteModified.fechaNacimiento;
            }
            i++;
        }

        if (indiceTurno < 0) { // no se encontro el turno en los bloques de turnos?
            indiceTurno = data.sobreturnos.findIndex(elem => elem._id.toString() === turno._id.toString());

            if (indiceTurno > -1) { // esta el turno entre los sobreturnos?
                data.sobreturnos[indiceTurno].paciente.nombre = pacienteModified.nombre;
                data.sobreturnos[indiceTurno].paciente.apellido = pacienteModified.apellido;
                data.sobreturnos[indiceTurno].paciente.documento = pacienteModified.documento;
                if (pacienteModified.contacto && pacienteModified.contacto[0]) {
                    data.sobreturnos[indiceTurno].paciente.telefono = pacienteModified.contacto[0].valor;
                }
                data.sobreturnos[indiceTurno].paciente.carpetaEfectores = pacienteModified.carpetaEfectores;
                data.sobreturnos[indiceTurno].paciente.fechaNacimiento = pacienteModified.fechaNacimiento;
            }
        }
        if (indiceTurno > -1) {
            try {
                Auth.audit(data, (userScheduler as any));
                saveAgenda(data);
            } catch (error) {
                return error;
            }
        }
    });
}

/* Devuelve el idAgenda y idBloque de un turno dado */
export async function getDatosTurnos(idTurno) {
    const pipeline = [
        {
            $match: {
                'bloques.turnos._id': Types.ObjectId(idTurno)
            }
        },
        { $unwind: '$bloques' },
        { $project: { _id: 0, idAgenda: '$_id', idBloque: '$bloques._id' } }
    ];

    const data = await Agenda.aggregate(pipeline);
    return data;

}

export function getCantidadConsultaXPrestacion(params) {

    return new Promise(async (resolve, reject) => {
        const pipeline = [
            {
                $match: {
                    $and: [
                        { horaInicio: { $gte: new Date(params.horaInicio) } },
                        { horaFin: { $lte: new Date(params.horaFin) } },
                        { 'organizacion._id': { $eq: Types.ObjectId(params.organizacion) } },
                        { 'bloques.turnos.estado': 'asignado' }
                    ]
                }
            },
            {
                $unwind: '$bloques'
            },
            {
                $project: {
                    idBloque: '$bloques._id',
                    bloqueTurnos: {
                        $concatArrays: ['$sobreturnos', '$bloques.turnos']
                    }
                }
            },


            {
                $unwind: '$bloqueTurnos'
            },
            {
                $project: {
                    hora: '$bloqueTurnos.horaInicio',
                    estado: '$bloqueTurnos.estado',
                    tipoPrestacion: '$bloqueTurnos.tipoPrestacion'
                }
            },
            {
                $match: {
                    estado: 'asignado'
                }
            },
            {
                $group: {
                    _id: '$tipoPrestacion.term',
                    nombrePrestacion: {
                        $first: '$tipoPrestacion.term'
                    },
                    conceptId: {
                        $first: '$tipoPrestacion.conceptId'
                    },
                    total: {
                        $sum: 1
                    },
                }
            }

        ];

        let data = await toArray(Agenda.aggregate(pipeline).cursor({}).exec());

        function removeDuplicates(arr) {
            const unique_array = [];
            const arrMap = arr.map(m => { return m._id; });
            for (let i = 0; i < arr.length; i++) {
                if (arrMap.lastIndexOf(arr[i]._id) === i) {
                    unique_array.push(arr[i]);
                }
            }
            return unique_array;
        }
        data = removeDuplicates(data);
        resolve(data);

    });
}

/**
 * Verifica si la agenda posee asistencia registrada
 *
 * @export
 * @param {*} agenda
 * @returns
 */
export async function poseeAsistencia(agenda) {
    return agenda.dinamica ?
        agenda.bloques.some((bloque: any) => bloque.turnos.some((turno: any) => turno.asistencia)) :
        agenda.bloques.some((bloque: any) => bloque.turnos.some((turno: any) => turno.asistencia ||
            (turno.diagnostico && turno.diagnostico.codificaciones && turno.diagnostico.codificaciones.length > 0)));
}

/** Verifica si existe solapamiento de agendas segun profesional y/o espacio físico en un determinado rango horario
*
* @export
* @param {*} horaInicio
* @param {*} horaFin
* @param {*} profesionalesIds
* @param {*} [espacioFisicoId]
* @param {*} [agendaId]
* @returns
*/

export async function verificarSolapamiento(data) {
    const horaInicio = data.horaInicio;
    const horaFin = data.horaFin;
    const profesionalesIds = (data.profesionales) ? data.profesionales.map(p => p._id) : null;
    const espacioFisicoId = (data.espacioFisico ? data.espacioFisico._id : null);
    const response = {
        tipoError: null,
        clonarOguardar: '',
        profesional: '',
        centroSalud: '',
        prestacion: '',
        creadaPor: ''
    };

    if (espacioFisicoId || (profesionalesIds && profesionalesIds.length)) {
        // Se buscan las agendas que se solapen con la actual en algún punto
        const $match: any = {
            $and: [
                {
                    $or: [
                        { horaInicio: { $lte: new Date(horaInicio) }, horaFin: { $gt: new Date(horaInicio) } },
                        { horaInicio: { $lt: new Date(horaFin) }, horaFin: { $gte: new Date(horaFin) } },
                        { horaInicio: { $gt: new Date(horaInicio), $lt: new Date(horaFin) } }
                    ]
                },
                {
                    estado: { $in: ['planificacion', 'disponible', 'publicada', 'pausada'] }
                },
                {
                    _id: { $not: { $eq: Types.ObjectId(data.id) } }
                }
            ]
        };

        const $or = [];

        if (profesionalesIds && profesionalesIds.length) {
            $or.push({ 'profesionales._id': { $in: profesionalesIds.map(id => Types.ObjectId(id)) } });
        }

        if (espacioFisicoId) {
            $or.push({ 'espacioFisico._id': espacioFisicoId });
        }

        $match.$and.push({ $or });
        try {
            const resultados = await Agenda.aggregate([{ $match }]);
            if (resultados.length > 0) {
                response.tipoError = resultados.some(a => a.espacioFisico && a.espacioFisico._id === espacioFisicoId) ? 'espacio-fisico' : 'profesional';
                let profesionales = [];
                let org = []; // nombre de la organizacion
                let agendaCreadaPor = [];
                let prestacionesAgenda = [];
                let espacio = [];
                for (const resultado of resultados) {
                    profesionales = profesionales.concat(resultado.profesionales);
                    org = org.concat(resultado.organizacion.nombre);
                    agendaCreadaPor = agendaCreadaPor.concat(resultado.createdBy.nombreCompleto);
                    espacio = espacio.concat(resultado.espacioFisico);
                    for (const prestacionAg of resultado.tipoPrestaciones) {
                        prestacionesAgenda = prestacionesAgenda.concat(prestacionAg.term);
                    }
                }

                if (profesionales.some(p => profesionalesIds.some(p2 => p2.toString() === p._id.toString())) || espacio.some(e => (e._id === espacioFisicoId))) {
                    profesionales.map((prof) => {
                        response.profesional = `${prof.nombre} ${prof.apellido}`;
                        response.centroSalud = `${org[0]}`;
                        response.prestacion = `${prestacionesAgenda[0]}`;
                        response.creadaPor = `${agendaCreadaPor[0]}`;
                    });
                }
            }
        } catch (error) {
            return error;
        }
    }
    return response;
}

// Verifica si un turno fue dado por la appMobile o el totem
export function esVirtual(turnoEmitido) {
    if (turnoEmitido === 'appMobile' || turnoEmitido === 'totem') {
        return true;
    } else {
        return false;
    }
}

export function agendaNueva(data, clon, req) {
    data._id = mongoose.Types.ObjectId();
    data.isNew = true;
    const nueva: any = new Agenda(data.toObject());
    nueva['horaInicio'] = combinarFechas(clon, new Date(data['horaInicio']));
    nueva['horaFin'] = combinarFechas(clon, new Date(data['horaFin']));
    nueva['updatedBy'] = undefined;
    nueva['updatedAt'] = undefined;
    nueva['createdBy'] = Auth.getAuditUser(req);
    nueva['createdAt'] = new Date();
    nueva['nota'] = undefined;
    nueva['enviarSms'] = true;

    if (nueva.dinamica && nueva.cupo >= 0) {
        nueva.bloques.forEach(b => {
            nueva.cupo += b.turnos.length;
        });
    }
    nueva['bloques'].forEach((bloque) => {
        bloque.horaInicio = combinarFechas(clon, bloque.horaInicio);
        bloque.horaFin = combinarFechas(clon, bloque.horaFin);
        if (bloque.pacienteSimultaneos) {
            bloque.restantesDelDia = bloque.accesoDirectoDelDia * bloque.cantidadSimultaneos;
            bloque.restantesProgramados = bloque.accesoDirectoProgramado * bloque.cantidadSimultaneos;
            bloque.restantesGestion = bloque.reservadoGestion * bloque.cantidadSimultaneos;
            bloque.restantesProfesional = bloque.reservadoProfesional * bloque.cantidadSimultaneos;
            bloque.restantesMobile = bloque.cupoMobile ? bloque.cupoMobile * bloque.cantidadSimultaneos : 0;

        } else {
            bloque.restantesDelDia = bloque.accesoDirectoDelDia;
            bloque.restantesProgramados = bloque.accesoDirectoProgramado;
            bloque.restantesGestion = bloque.reservadoGestion;
            bloque.restantesProfesional = bloque.reservadoProfesional;
            bloque.restantesMobile = bloque.cupoMobile ? bloque.cupoMobile : 0;
        }
        bloque._id = mongoose.Types.ObjectId();
        if (!nueva.dinamica) {
            bloque.turnos.forEach((turno, index1) => {
                turno.horaInicio = combinarFechas(clon, turno.horaInicio);
                turno.estado = 'disponible';
                turno.asistencia = undefined;
                turno.paciente = undefined;
                turno.tipoPrestacion = nueva.nominalizada ? undefined : nueva.bloques[0].tipoPrestaciones[0];
                turno.idPrestacionPaciente = undefined;
                turno.nota = undefined;
                turno._id = mongoose.Types.ObjectId();
                turno.tipoTurno = undefined;
                turno.updatedAt = undefined;
                turno.updatedBy = undefined;
                turno.diagnostico = { codificaciones: [] };
                turno.reasignado = undefined;
                turno.emitidoPor = undefined;
                turno.fechaHoraDacion = undefined;
                turno.link = undefined;
                turno.motivoConsulta = undefined;
                turno.usuarioDacion = undefined;
                turno.profesional = undefined;
                turno.horaAsistencia = undefined;
            });
        } else {
            bloque.turnos = [];
        }
    });
    nueva['estado'] = 'planificacion';
    nueva['sobreturnos'] = [];
    return nueva;
}
