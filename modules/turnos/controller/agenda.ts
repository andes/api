import { SnomedCIE10Mapping } from './../../../core/term/controller/mapping';
import * as cie10 from './../../../core/term/schemas/cie10';
import * as agendaModel from '../../turnos/schemas/agenda';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import { userScheduler } from '../../../config.private';
import { Logger } from '../../../utils/logService';
import { log } from '@andes/log';
import { logKeys } from '../../../config';
import { model as Prestacion } from '../../rup/schemas/prestacion';
import * as prestacionController from '../../rup/controllers/prestacion';
import * as request from 'request';
import * as mongoose from 'mongoose';
import { toArray } from '../../../utils/utils';
import { EventCore } from '@andes/event-bus';
import { NotificationService } from '../../../modules/mobileApp/controller/NotificationService';
import * as codificacionModel from '../../rup/schemas/codificacion';
import { Types } from 'mongoose';

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


// Turno
export async function liberarTurno(req, data, turno) {
    const position = getPosition(req, data, turno._id);
    let enEjecucion = await prestacionController.enEjecucion(turno);
    if (enEjecucion) {
        return false;
    }

    if (!data.dinamica) {
        turno.estado = 'disponible';
        turno.paciente = null;
        turno.tipoPrestacion = null;
        turno.nota = null;
        turno.confirmedAt = null;
        turno.reasignado = undefined;  // Esto es necesario cuando se libera un turno reasignado
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
    } else {
        if (data.cupo > -1) {
            data.cupo++;
        }
        const newTurnos = data.bloques[position.indexBloque].turnos;
        newTurnos.splice(position.indexTurno, 1);
        data.bloques[position.indexBloque].turnos = newTurnos;
    }
    return true;
}


// Turno
export function suspenderTurno(req, data, turno) {
    if (turno.estado !== 'turnoDoble') {
        turno.estado = 'suspendido';
    }
    delete turno.paciente;
    delete turno.tipoPrestacion;
    turno.motivoSuspension = req.body.motivoSuspension;
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
}

// Turno
export function codificarTurno(req, data, tid) {
    return new Promise((resolve, reject) => {
        const turno = getTurno(req, data[0], tid);

        const query = Prestacion.find({ $where: 'this.estados[this.estados.length - 1].tipo ==  "validada"' });
        query.where('solicitud.turno').equals(tid);
        query.exec((err, data1) => {
            if (err) {
                return ({
                    err: 'No se encontro prestacion para el turno'
                });
            }
            const arrPrestacion = data1 as any;
            const codificaciones = [];
            if (arrPrestacion.length > 0 && arrPrestacion[0].ejecucion) {
                const prestaciones = arrPrestacion[0].ejecucion.registros.filter(f => {
                    return f.concepto.semanticTag !== 'elemento de registro';
                });
                prestaciones.forEach(async registro => {
                    const parametros = {
                        conceptId: registro.concepto.conceptId,
                        paciente: turno.paciente,
                        secondaryConcepts: prestaciones.map(r => r.concepto.conceptId)
                    };
                    const map = new SnomedCIE10Mapping(parametros.paciente, parametros.secondaryConcepts);
                    try {
                        let codigoCie10: any = {
                            codigo: 'Mapeo no disponible'
                        };
                        let target = await map.transform(parametros.conceptId);
                        if (target) {
                            let cie = await cie10.model.findOne({
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

                        if (prestaciones.length === codificaciones.length) {
                            turno.diagnostico = {
                                ilegible: false,
                                codificaciones: codificaciones.filter(cod => Object.keys(cod).length > 0)
                            };
                            turno.asistencia = 'asistio';
                            resolve(data);
                        }

                    } catch (error) {
                        reject(error);
                    }

                });
            } else {
                return resolve(null);
            }
        });
    });
}

// Turno
export function guardarNotaTurno(req, data, tid = null) {
    const turno = getTurno(req, data, tid);
    turno.nota = req.body.textoNota;
    turno.updatedAt = new Date();
    turno.updatedBy = req.user.usuario || req.user;
}

// Turno
export function darTurnoDoble(req, data, tid = null) {   // NUEVO
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

}

// Agenda
export function agregarSobreturno(req, data) {
    const sobreturno = req.body.sobreturno;
    if (sobreturno) {
        const usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
        // Copia la organización desde el token
        usuario.organizacion = (req as any).user.organizacion;
        sobreturno.updatedAt = new Date();
        sobreturno.updatedBy = usuario;
        data.sobreturnos.push(sobreturno);
        return data.sobreturnos[data.sobreturnos.length - 1]; // Para poder trackear el id del sobreturno
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

            data.bloques.forEach(bloque => {
                bloque.turnos.forEach(turno => {
                    if (turno.estado !== 'turnoDoble') {
                        turno.estado = 'suspendido';
                    }
                    turno.motivoSuspension = 'agendaSuspendida';
                    turno.avisoSuspension = 'no enviado';

                    NotificationService.notificarSuspension(turno);

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
        index = turnos.findIndex((t) => t._id.toString() === idTurno.toString());
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
        const url = 'http://nolaborables.com.ar/api/v2/feriados/' + anio;

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
 * Actualiza las cantidades de turnos restantes de la agenda antes de su fecha de inicio,
 * se ejecuta una vez al día por el scheduler.
 *
 * @export actualizarTiposDeTurno()
 * @returns resultado
 */
export async function actualizarTiposDeTurno() {
    const hsActualizar = 48;
    const cantDias = hsActualizar / 24;
    let fechaActualizar = moment(new Date()).add(cantDias, 'days');
    const esDomingo = false;

    while ((await esFeriado(fechaActualizar) && !esDomingo) || (moment(fechaActualizar).day().toString() === '6')) {
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
    }
    // actualiza los turnos restantes de las agendas 2 dias antes de su horaInicio.
    const condicion = {
        estado: 'publicada',
        horaInicio: {
            $gte: (moment(fechaActualizar).startOf('day').toDate() as any),
            $lte: (moment(fechaActualizar).endOf('day').toDate() as any)
        }
    };

    const cursor = agendaModel.find(condicion).cursor();
    return cursor.eachAsync(doc => {
        const agenda: any = doc;
        for (let j = 0; j < agenda.bloques.length; j++) {
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
        }

        Auth.audit(agenda, (userScheduler as any));
        return saveAgenda(agenda).then(() => {
            Logger.log(userScheduler, 'citas', 'actualizarTiposDeTurno', {
                idAgenda: agenda._id,
                organizacion: agenda.organizacion,
                horaInicio: agenda.horaInicio,
                updatedAt: agenda.updatedAt,
                updatedBy: agenda.updatedBy

            });
            return Promise.resolve();
        }).catch(() => {
            return Promise.resolve();
        });
    });

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
    const cursor = agendaModel.find(condicion).cursor();
    return cursor.eachAsync(doc => {
        const agenda: any = doc;
        let turnos = [];
        let todosAsistencia = false;
        let todosAuditados = false;
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
    let prestaciones = await agendaModel.aggregate(pipelinePrestaciones);
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
    let agendas = await agendaModel.aggregate(pipelineAgendas);
    return agendas;

}

async function actualizarAux(agenda: any) {
    Auth.audit(agenda, (userScheduler as any));
    await saveAgenda(agenda);
    Logger.log(userScheduler, 'citas', 'actualizarEstadoAgendas', {
        idAgenda: agenda._id,
        organizacion: agenda.organizacion,
        horaInicio: agenda.horaInicio,
        updatedAt: agenda.updatedAt,
        updatedBy: agenda.updatedBy
    });
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
    const cursor = agendaModel.find(condicion).cursor();
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
            Logger.log(userScheduler, 'citas', 'actualizarTurnosDelDia', {
                idAgenda: agenda._id,
                organizacion: agenda.organizacion,
                horaInicio: agenda.horaInicio,
                updatedAt: agenda.updatedAt,
                updatedBy: agenda.updatedBy

            });
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
    const cursor = agendaModel.find(condicion).cursor();
    let logRequest = {
        user: {
            usuario: { nombre: 'actualizarTurnosMobileJob', apellido: 'actualizarTurnosMobileJob' },
            app: 'citas',
            organizacion: userScheduler.user.organizacion.nombre
        },
        ip: 'localhost',
        connection: {
            localAddress: ''
        }
    };

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
            await log(logRequest, logKeys.turnosMobileUpdate.key, null, logKeys.turnosMobileUpdate.operacion, err, { idAgenda: agenda._id });
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


// Actualiza el paciente dentro del turno, si se realizo un update del paciente (Eventos entre módulos)
EventCore.on('mpi:patient:update', async (pacienteModified) => {
    // let req = {
    //     query: {
    //         estado: 'asignado',
    //         pacienteId: pacienteModified.id,
    //         horaInicio: moment(new Date()).startOf('day').toDate() as any
    //     }
    // };
    // let turnos: any = await turnosController.getTurno(req);
    // if (turnos.length > 0) {
    //     turnos.forEach(element => {
    //         try {
    //             agendaController.updatePaciente(pacienteModified, element);
    //         } catch (error) {
    //             return error;
    //         }
    //     });
    // }
});

/**
 * Actualiza el paciente embebido en el turno.
 *
 * @export
 * @param {any} pacienteModified
 * @param {any} turno
 */
export function updatePaciente(pacienteModified, turno) {
    agendaModel.findById(turno.agenda_id, (err, data, next) => {
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

export function getConsultaDiagnostico(params) {
    return new Promise(async (resolve, reject) => {
        let pipeline = [];
        pipeline = [{
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
                bloqueTurnos: { $concatArrays: ['$sobreturnos', '$bloques.turnos'] }
            }
        },
        {
            $unwind: '$bloqueTurnos'
        },
        {
            $project: {
                estado: '$bloqueTurnos.estado',
                paciente: '$bloqueTurnos.paciente',
                tipoPrestacion: '$bloqueTurnos.tipoPrestacion',
                diagnosticoCodificaciones: '$bloqueTurnos.diagnostico.codificaciones',
                codificacionesAuditoria: '$bloqueTurnos.diagnosticoCodificaciones.codificacionesAuditoria',
            }
        },
        {
            $match: {
                estado: 'asignado'
            }
        },
        {
            $unwind: { path: '$diagnosticoCodificaciones', preserveNullAndEmptyArrays: true }
        },
        {
            $project: {
                estado: '$estado',
                nombrePaciente: '$paciente.nombre',
                apellidoPaciente: '$paciente.apellido',
                documentoPaciente: '$paciente.documento',
                tipoPrestacion: '$tipoPrestacion.conceptId',
                descripcionPrestacion: '$tipoPrestacion.term',
                auditoriaCodigo: '$diagnosticoCodificaciones.codificacionAuditoria.codigo',
                auditoriaNombre: '$diagnosticoCodificaciones.codificacionAuditoria.nombre',
                codProfesionalCie10Codigo: '$diagnosticoCodificaciones.codificacionProfesional.cie10.codigo',
                codrofesionalCie10Nombre: '$diagnosticoCodificaciones.codificacionProfesional.cie10.nombre',
                codProfesionalSnomedCodigo: '$diagnosticoCodificaciones.codificacionProfesional.snomed.conceptId',
                codProfesionalSnomedNombre: '$diagnosticoCodificaciones.codificacionProfesional.snomed.term',
            }
        },
        ];

        const pipeline2 = [
            {
                $match: {
                    'diagnostico.codificaciones.codificacionAuditoria': { $exists: true, $ne: {} },
                }
            },
            {
                $lookup: {
                    from: 'prestaciones',
                    localField: 'idPrestacion',
                    foreignField: '_id',
                    as: 'prestacion'
                }
            },
            { $unwind: '$diagnostico.codificaciones' },
            { $unwind: '$prestacion' },
            {
                $match: {
                    'diagnostico.codificaciones.codificacionAuditoria': { $exists: true, $ne: {} },
                    'prestacion.solicitud.organizacion.id': { $eq: mongoose.Types.ObjectId(params.organizacion) },
                    $and: [
                        { 'prestacion.solicitud.fecha': { $lte: new Date(params.horaFin) } },
                        { 'prestacion.solicitud.fecha': { $gte: new Date(params.horaInicio) } }
                    ]
                }
            },
            {
                $project: {
                    estado: '$estado',
                    nombrePaciente: '$paciente.nombre',
                    apellidoPaciente: '$paciente.apellido',
                    documentoPaciente: '$paciente.documento',
                    tipoPrestacion: '$prestacion.solicitud.tipoPrestacion.conceptId',
                    descripcionPrestacion: '$prestacion.solicitud.tipoPrestacion.term',
                    auditoriaCodigo: '$diagnostico.codificaciones.codificacionAuditoria.codigo',
                    auditoriaNombre: '$diagnostico.codificaciones.codificacionAuditoria.nombre',
                    codProfesionalCie10Codigo: '$diagnostico.codificaciones.codificacionProfesional.cie10.codigo',
                    codrofesionalCie10Nombre: '$diagnostico.codificaciones.codificacionProfesional.cie10.nombre',
                    codProfesionalSnomedCodigo: '$diagnostico.codificaciones.codificacionProfesional.snomed.conceptId',
                    codProfesionalSnomedNombre: '$diagnostico.codificaciones.codificacionProfesional.snomed.term',
                }
            }
        ];

        const p1 = toArray(agendaModel.aggregate(pipeline).cursor({}).exec());
        const p2 = toArray(codificacionModel.aggregate(pipeline2).cursor({}).exec());

        let [diagnosticosTurnos, diagnosticosFueraAgenda] = await Promise.all([p1, p2]);

        let data = diagnosticosTurnos.concat(diagnosticosFueraAgenda);

        const removeDuplicates = (arr) => {
            const unique_array = [];
            const arrMap = arr.map(m => m._id);
            for (let i = 0; i < arr.length; i++) {
                if (arrMap.lastIndexOf(arr[i]._id) === i) {
                    unique_array.push(arr[i]);
                }
            }
            return unique_array;
        };

        data = removeDuplicates(data);
        resolve(data);
    });
}

/* Devuelve el idAgenda y idBloque de un turno dado */
export async function getDatosTurnos(idTurno) {
    let pipeline = [];
    pipeline = [
        {
            $match: {
                'bloques.turnos._id': Types.ObjectId(idTurno)
            }
        },
        { $unwind: '$bloques' },
        { $project: { _id: 0, idAgenda: '$_id', idBloque: '$bloques._id' } }
    ];

    let data = await agendaModel.aggregate(pipeline);
    return data;

}

export function getCantidadConsultaXPrestacion(params) {

    return new Promise(async (resolve, reject) => {
        let pipeline = [];
        pipeline = [{
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

        let data = await toArray(agendaModel.aggregate(pipeline).cursor({}).exec());

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
    let response = null;

    if (espacioFisicoId || (profesionalesIds && profesionalesIds.length)) {

        // Se buscan las agendas que se solapen con la actual en algún punto
        let $match: any = {
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

        let $or = [];

        if (profesionalesIds && profesionalesIds.length) {
            $or.push({ 'profesionales._id': { $in: profesionalesIds.map(id => Types.ObjectId(id)) } });
        }

        if (espacioFisicoId) {
            $or.push({ 'espacioFisico._id': espacioFisicoId });
        }

        $match.$and.push({ $or });
        try {
            const resultados = await agendaModel.aggregate([{ $match }]);
            if (resultados.length > 0) {
                response = 'La agenda no se pudo guardar:';
                if (resultados.some(a => a.espacioFisico && a.espacioFisico._id === espacioFisicoId)) {
                    response += ' El espacio físico está asignado a otra agenda en ese horario.';
                }

                let profesionales = [];
                let org = []; // nombre de la organizacion
                let agendaCreadaPor = [];
                let prestacionesAgenda = [];
                for (let resultado of resultados) {
                    profesionales = profesionales.concat(resultado.profesionales);
                    org = org.concat(resultado.organizacion.nombre);
                    agendaCreadaPor = agendaCreadaPor.concat(resultado.createdBy.nombreCompleto);
                    for (let prestacionAg of resultado.tipoPrestaciones) {
                        prestacionesAgenda = prestacionesAgenda.concat(prestacionAg.term);
                    }
                }
                if (profesionales.some(p => profesionalesIds.some(p2 => p2.toString() === p._id.toString()))) {
                    response += ` Uno o más profesionales están asignados a otra agenda en ese horario. `;
                    profesionales.forEach((prof, idx) => {
                        response += `<br><br>Profesional: <strong>${prof.nombre} ${prof.apellido} </strong> <br>Centro de Salud: <strong>${org[idx]} </strong> <br> Prestacion: <strong>${prestacionesAgenda[idx]}</strong> <br>Creada por: <strong>${agendaCreadaPor[idx]} </strong>`;
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
