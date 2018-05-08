import * as mongoose from 'mongoose';
import * as utils from './utils';
import * as config from './config';
import * as sql from 'mssql';
import { model as Organizaciones } from '../../../../core/tm/schemas/organizacion';
import * as carpetaPaciente from '../../schemas/carpetaPaciente';
import * as configPrivate from '../../../../config.private';

import * as debug from 'debug';
let logger = debug('carpetasJob');

let db;
let organizacion;

const findUpdateCarpeta = async (paciente) => {
    let documentoPaciente = paciente['numeroDocumento'];
    let condicion = { documento: documentoPaciente };
    let carpetaNueva = {
        organizacion: {
            _id: organizacion._id,
            nombre: organizacion.nombre
        },
        idPaciente: paciente['idPaciente'],
        nroCarpeta: paciente['historiaClinica']
    };
    // buscamos en carpetaPaciente los pacientes con documentoPaciente
    let lista = await carpetaPaciente.find(condicion).exec();
    if (lista && lista.length) {
        let carpeta: any = lista[0];
        let carpetas = carpeta.carpetaEfectores.filter(c => c.organizacion._id === organizacion._id);
        if (carpetas && carpetas.length) {
            carpeta.carpetaEfectores.map(c => {
                if (c.organizacion._id === organizacion._id) {
                    return c.nroCarpeta = paciente['historiaClinica'];
                }
            });
        } else {
            carpeta.carpetaEfectores.push(carpetaNueva);
        }

        if (carpeta._id) {
            // logger('actualizo', documentoPaciente);
            carpetaPaciente.update({ '_id': carpeta._id }, {
                $set:
                    { 'carpetaEfectores': carpeta.carpetaEfectores }
            }).exec();
        }
    } else {
        // El dni no existe en la colección carpetaPaciente
        // Se guarda el documento en la colección carpetaPaciente
        let nuevo = new carpetaPaciente({
            'documento': documentoPaciente,
            'carpetaEfectores': [carpetaNueva]
        });
        nuevo.save();
    }
};


export async function migrar() {
    try {
        let efectores: any = await Organizaciones.find({ 'integracionActiva': true }).exec();
        if (efectores && efectores.length > 0) {

            logger('Efectores---->', efectores);
            // ejecutamos la migracion para cada efector en paralelo.
            for (let efector of efectores) {
                await migrarEfector(efector);
            }

        } else {
            logger('Código de organización inválido, verifica el codigo Sisa ingresado');
        }
    } catch (err) { logger('Error al obtener la organización', err); }

    async function migrarEfector(element: any) {

        logger('Migrando carpetas de pacientes en:  ', element.nombre);
        let idSips = await getIdSips(element);
        logger('codigo ', element.codigo.sisa);
        let q_limites = `select MIN(PAC.idPaciente) as min, COUNT(PAC.idPaciente) as max from dbo.sys_paciente as PAC inner
                            join dbo.Sys_RelHistoriaClinicaEfector AS rhe ON rhe.idPaciente = pac.idPaciente
                            WHERE PAC.activo = 1` + ' AND rhe.idEfector=' + idSips;
        logger('Se actualizarán las carpetas de los pacientes desde SIPS de ', element.nombre);
        organizacion = element;
        if (idSips) {
            // let consulta = config.consultaPacienteSipsHC + ' AND efector.idEfector=' + element.codigo.idSips + ' AND PAC.idPaciente between @offset and @limit';
            let consulta = config.consultaCarpetaPacienteSips + ' AND rhe.idEfector=' + idSips.idEfector;
            logger('EFECTOR', idSips, organizacion.nombre);
            // return utils.migrarOffset(consulta, q_limites, 100, insertCarpeta);
            await utils.migrar(consulta, q_limites, 10000, findUpdateCarpeta);
            logger('Migracion de datos completa desde ', organizacion.nombre);
        } else {
            logger('ID sips inválido');
        }

    }

    async function getIdSips(efector) {

        let connection = {
            user: configPrivate.conSql.auth.user,
            password: configPrivate.conSql.auth.password,
            server: configPrivate.conSql.serverSql.server,
            database: configPrivate.conSql.serverSql.database
        };
        try {
            const connectionPool = await sql.connect(connection);
            sql.on('error', err => {
                logger('Error SQL---->', err);
            });

            let querySips = `select idEfector from dbo.sys_Efector as efector WHERE codigoSisa=` + `'` + String(efector.codigo.sisa) + `'`;
            let resultado = await connectionPool.request()
                .query(querySips);
            resultado = resultado.recordset[0];
            logger('IDSIPS', resultado);
            return resultado;
        } catch (err) { logger('Error obteniendo ID sips', err); }
    }
}


