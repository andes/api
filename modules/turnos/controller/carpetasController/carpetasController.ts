import * as mongoose from 'mongoose';
import * as utils from './utils';
import * as config from './config';
import * as sql from 'mssql';
import { model as Organizaciones } from '../../../../core/tm/schemas/organizacion';
import * as carpetaPaciente from '../../schemas/carpetaPaciente';

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
            carpetaPaciente.update({ '_id': carpeta._id }, {
                $set:
                    { 'carpetaEfectores': carpeta.carpetaEfectores }
            });
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
            efectores.forEach(async element => {
                logger('Migrando carpetas de pacientes en:  ', element.nombre);
                let q_idSips = `select idEfector from dbo.sys_Efector as efector
                                WHERE codigoSisa=` + element.codigo.sisa;
                let q_limites = `select MIN(PAC.idPaciente) as min, COUNT(PAC.idPaciente) as max from dbo.sys_paciente as PAC inner
                            join dbo.Sys_RelHistoriaClinicaEfector AS rhe ON rhe.idPaciente = pac.idPaciente
                            WHERE PAC.activo = 1` + ' AND rhe.idEfector=' + element.codigo.idSips;
                // Se busca la organización de la que se van a migrar las carpetas de pacientes
                logger('codigo ', element.codigo.codigoSisa);
                logger('Se actualizarán las carpetas de los pacientes desde SIPS de ', efectores[0].nombre);

                organizacion = efectores[0];
                if (element.codigo.idSips) {

                    // let consulta = config.consultaPacienteSipsHC + ' AND efector.idEfector=' + element.codigo.idSips + ' AND PAC.idPaciente between @offset and @limit';
                    let consulta = config.consultaCarpetaPacienteSips + ' AND rhe.idEfector=' + element.codigo.idSips;
                    logger('EFECTOR', element.codigo.idSips, organizacion.nombre);
                    // return utils.migrarOffset(consulta, q_limites, 100, insertCarpeta);
                    await utils.migrar(consulta, q_limites, 10000, findUpdateCarpeta);
                    logger('Migracion de datos completa desde ', organizacion.nombre);

                } else {
                    logger('Código de organización inválido, verifica el codigo Sisa ingresado');
                }
            });
        } else {
            logger('Código de organización inválido, verifica el codigo Sisa ingresado');
        }
    } catch (err) { logger('Error al obtener la organización', err); }
}


