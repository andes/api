import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as constantes from '../schemas/constantes';
import {
    agendasCache
} from '../schemas/agendasCache';
import {
    profesional
} from './../../../core/tm/schemas/profesional';
import * as organizacion from './../../../core/tm/schemas/organizacion';
import * as sql from 'mssql';


// Funciones privadas

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
        this.organizacion.findById(mongoose.Types.ObjectId(idOrganizacion), function (err, unaOrganizacion) {
            if (err) {
                return reject(err);
            }
            return resolve(unaOrganizacion);
        });
    });
}

// Funciones públicas

export function organizacionBySisaCode(code): any {
    return new Promise((resolve, reject) => {
        let query = {'codigo.sisa': code};
        this.organizacion.find(query), function (err, unaOrganizacion) {
            if (err) {
                reject(err);
            }
            resolve(unaOrganizacion);
        };
    });
}

export async function getEncabezados(fechaFiltro: any) {
    return new Promise(async function (resolve, reject) {
        try {
            let query = 'select efector.codigoSisa as efectorCodSisa, efector.nombre as efector, encabezado.apellido, encabezado.nombre, encabezado.fechaNacimiento, encabezado.sexo, ' +
                'encabezado.numeroDocumento, encabezado.fecha, encabezado.idProtocolo, encabezado.solicitante from LAB_ResultadoEncabezado as encabezado ' +
                'inner join Sys_Efector as efector on encabezado.idEfector = efector.idEfector ' +
                'where encabezado.fecha = ' + '\'' + fechaFiltro + '\'';
            let result = await new sql.Request().query(query);
            resolve(result);
        } catch (err) {
            reject(null);
        }
    });
}

export async function getDetalles(idProtocolo) {
    return new Promise(async function (resolve, reject) {
        try {
            let query = 'select grupo, item, resultado, valorReferencia, observaciones ' +
            ' from LAB_ResultadoDetalle as detalle where detalle.idProtocolo = ' + idProtocolo;
            let result = await new sql.Request().query(query);
            resolve(result);
        } catch (err) {
            reject(null);
        }
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