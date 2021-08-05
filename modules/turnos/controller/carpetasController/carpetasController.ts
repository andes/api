import * as debug from 'debug';
import * as sql from 'mssql';
import * as configPrivate from '../../../../config.private';
import { Organizacion } from '../../../../core/tm/schemas/organizacion';
import { LoggerJobs } from '../../../../utils/loggerJobs';
import * as carpetaPaciente from '../../../carpetas/schemas/carpetaPaciente';
import * as config from './config';
import * as utils from './utils';

const logger = debug('carpetasJob');

let organizacion;
const connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};
const findUpdateCarpeta = async (paciente) => {
    const documentoPaciente = paciente['numeroDocumento'];
    const condicion = { documento: documentoPaciente };
    const carpetaNueva = {
        organizacion: {
            _id: organizacion._id,
            nombre: organizacion.nombre
        },
        idPaciente: paciente['idPaciente'],
        nroCarpeta: paciente['historiaClinica']
    };
    // buscamos en carpetaPaciente los pacientes con documentoPaciente
    try {
        const lista = await carpetaPaciente.find(condicion).exec();
        if (lista && lista.length) {
            const carpeta: any = lista[0];

            const carpetas = carpeta.carpetaEfectores.filter(c => {
                // logger('c.organizacion: ', c.organizacion._id, 'organizacion._id: ', organizacion._id);
                return (String(c.organizacion._id) === String(organizacion._id));
            });
            // logger('CARPETAS', carpetas.length);
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
                carpetaPaciente.update({ _id: carpeta._id }, {
                    $set:
                        { carpetaEfectores: carpeta.carpetaEfectores }
                }).exec();
            }
        } else {
            // El dni no existe en la colección carpetaPaciente
            // Se guarda el documento en la colección carpetaPaciente
            const nuevo = new carpetaPaciente({
                documento: documentoPaciente,
                carpetaEfectores: [carpetaNueva]
            });
            nuevo.save();
        }
    } catch (err) {
        logger('Error en findUpdateCarpeta', err);
        LoggerJobs.log('actualizar carpetas', 'Error en findUpdateCarpeta: ' + err);
    }
};


export async function migrar() {
    try {
        const efectores: any = await Organizacion.find({ integracionActiva: true }).exec();
        if (efectores && efectores.length > 0) {

            logger('Efectores---->', efectores);
            // ejecutamos la migracion para cada efector en paralelo.
            for (const efector of efectores) {
                await migrarEfector(efector);
            }

        } else {
            logger('Código de organización inválido, verifica el codigo Sisa ingresado');
        }
    } catch (err) {
        logger('Error al obtener la organización', err);
        LoggerJobs.log('actualizar carpetas', 'Error al obtener la organización: ' + err);
    }

    async function migrarEfector(element: any) {

        logger('Migrando carpetas de pacientes en:  ', element.nombre);
        const idSips = await getIdSips(element);
        logger('codigo ', element.codigo.sisa);
        const q_limites = `select MIN(PAC.idPaciente) as min, COUNT(PAC.idPaciente) as max from dbo.sys_paciente as PAC inner
                            join dbo.Sys_RelHistoriaClinicaEfector AS rhe ON rhe.idPaciente = pac.idPaciente
                            WHERE PAC.activo = 1` + ' AND rhe.idEfector=' + idSips;
        logger('Se actualizarán las carpetas de los pacientes desde SIPS de ', element.nombre);
        organizacion = element;
        if (idSips) {
            try {
                // let consulta = config.consultaPacienteSipsHC + ' AND efector.idEfector=' + element.codigo.idSips + ' AND PAC.idPaciente between @offset and @limit';
                const consulta = config.consultaCarpetaPacienteSips + ' AND rhe.idEfector=' + idSips.idEfector;
                logger('EFECTOR', idSips, organizacion.nombre);
                const connectionPool = await sql.connect(connection);
                sql.on('error', err => {
                    logger('Error SQL---->', err);
                });
                await utils.migrar(consulta, q_limites, 10000, findUpdateCarpeta, connectionPool);
                sql.close();
                logger('Migracion de datos completa desde ', organizacion.nombre);
            } catch (err) {
                logger('Error migrando en efector' + organizacion.nombre, err);
                LoggerJobs.log('actualizar carpetas', 'Error migrando en efector' + organizacion.nombre + ': ' + err);
            }
        } else {
            logger('ID sips inválido');
        }

    }

    async function getIdSips(efector) {

        try {
            const connectionPool = await sql.connect(connection);
            sql.on('error', err => {
                logger('Error SQL---->', err);
            });

            const querySips = `select idEfector from dbo.sys_Efector as efector WHERE codigoSisa='${String(efector.codigo.sisa)}'`;
            let resultado = await connectionPool.request()
                .query(querySips);
            resultado = resultado.recordset[0];
            logger('IDSIPS', resultado);
            sql.close();
            return resultado;
        } catch (err) {
            logger('Error obteniendo ID sips', err);
            LoggerJobs.log('actualizar carpetas', 'Error obteniendo ID sips: ' + err);
        }
    }
}

