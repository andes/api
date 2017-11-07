import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as constantes from '../schemas/constantes';
import {
    agendasCache
} from '../schemas/agendasCache';
import {
    profesional
} from './../../../core/tm/schemas/profesional';
import {
    model as organizacion
} from './../../../core/tm/schemas/organizacion';



function traeProfesionalPorId(id) {
    return new Promise((resolve, reject) => {
        profesional.findById(mongoose.Types.ObjectId(id), function (err, unProfesional) {
            if (err) {
                return reject(err);
            }
            return resolve(unProfesional);
        });
    });
}

/** Dada una lista de profesionales, devuelve una lista de profesionales completa */
function profesionalCompleto(lstProfesionales): any {
    return new Promise((resolve, reject) => {
        let listaProf = [];
        let counter = 0;
        lstProfesionales.forEach(async prof => {
            let pro = await traeProfesionalPorId(prof.id);
            counter++;
            listaProf.push(pro);
            // Esto es una mersada pero no me doy cuenta como hacerlo mejor
            if (counter === lstProfesionales.length) {
                return resolve(listaProf);
            }
        });
    });
}

/** Dado un id de Organización devuelve el objeto completo */
function organizacionCompleto(idOrganizacion): any {
    return new Promise((resolve, reject) => {
        organizacion.findById(mongoose.Types.ObjectId(idOrganizacion), function (err, unaOrganizacion) {
            if (err) {
                return reject(err);
            }
            return resolve(unaOrganizacion);
        });
    });
}


export async function cacheTurnosSips(unaAgenda) {
    // Armo el DTO para guardar en la cache de agendas

    if ((unaAgenda.estado !== 'planificacion') && (unaAgenda.nominalizada)) {

        let agenda = new agendasCache({
            id: unaAgenda.id,
            organizacion: await organizacionCompleto(unaAgenda.organizacion.id),
            profesionales: await profesionalCompleto(unaAgenda.profesionales),
            tipoPrestaciones: unaAgenda.tipoPrestaciones,
            espacioFisico: unaAgenda.espacioFisico,
            bloques: unaAgenda.bloques,
            estado: unaAgenda.estado,
            horaInicio: unaAgenda.horaInicio,
            horaFin: unaAgenda.horaFin,
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente
        });

        agenda.save(function (err, agendaGuardada: any) {
            if (err) {
                return err;
            }
            return true;
        });
    }
}
