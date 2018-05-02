import * as mongoose from 'mongoose';
import * as utils from './utils';
import * as config from './config';
import * as sql from 'mssql';
import { model as Organizaciones } from '../../../../core/tm/schemas/organizacion';
import * as debug from 'debug';
let logger = debug('carpetasJob');

let db;
let organizacion;

function abrirConexion(url) {
    // return mongodb.MongoClient.connect(url);
}

// function cerrarConexion() {
//     return mongodb.MongoClient.close();
// }

function find(coleccion, condicion) {
    return db.collection(coleccion).find(condicion).toArray();
}

function update(coleccion, condicion, camposupdate) {
    return db.collection(coleccion).findOneAndUpdate(condicion, camposupdate);
}

function insert(coleccion, documento) {
    return db.collection(coleccion).insertOne(documento);
}

const insertCarpeta = (paciente) => {
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

    return insert('carpetaPacienteEfector', {
        'documento': documentoPaciente,
        'carpetaEfectores': [carpetaNueva]
    });

};

const findUpdateCarpeta = (paciente) => {
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
    return find('carpetaPaciente', condicion)
        .then(lista => {
            let carpetaPaciente;
            if (lista && lista.length) {
                carpetaPaciente = lista[0];
                let carpetas = carpetaPaciente.carpetaEfectores.filter(c => c.organizacion._id === organizacion._id);
                if (carpetas && carpetas.length) {
                    carpetaPaciente.carpetaEfectores.map(c => {
                        if (c.organizacion._id === organizacion._id) {
                            return c.nroCarpeta = paciente['historiaClinica'];
                        }
                    });
                } else {
                    carpetaPaciente.carpetaEfectores.push(carpetaNueva);
                }

                if (carpetaPaciente._id) {
                    return update('carpetaPaciente', { '_id': carpetaPaciente._id }, {
                        $set:
                            { 'carpetaEfectores': carpetaPaciente.carpetaEfectores }
                    });
                }

            } else {
                // El dni no existe en la colección carpetaPaciente 
                // Se guarda el documento en la colección carpetaPaciente
                logger('nuevo', documentoPaciente);
                return insert('carpetaPaciente', {
                    'documento': documentoPaciente,
                    'carpetaEfectores': [carpetaNueva]
                });

            }
        });
};

export async function migrar() {
    logger('Migrando carpetas de pacientes');
    let q_limites = `select MIN(PAC.idPaciente) as min, COUNT(PAC.idPaciente) as max from dbo.sys_paciente as PAC inner
                        join dbo.Sys_RelHistoriaClinicaEfector AS rhe ON rhe.idPaciente = pac.idPaciente
                            WHERE PAC.activo = 1` + ' AND rhe.idEfector=' + config.organizacionSips.idSips;
    // Se busca la organización de la que se van a migrar las carpetas de pacientes
    logger('codigo ', config.organizacionSips.codigoSisa);

    try {
        let efectores: any = await Organizaciones.find({ 'codigo.sisa': config.organizacionSips.codigoSisa }).exec();
        if (efectores && efectores.length > 0) {
            logger('Se actualizarán las carpetas de los pacientes desde SIPS de ', efectores[0].nombre);
            organizacion = efectores[0];
            if (config.organizacionSips.idSips) {
                // let consulta = config.consultaPacienteSipsHC + ' AND efector.idEfector=' + config.organizacionSips.idSips + ' AND PAC.idPaciente between @offset and @limit';
                let consulta = config.consultaCarpetaPacienteSips + ' AND rhe.idEfector=' + config.organizacionSips.idSips;
                logger('EFECTOR', config.organizacionSips.idSips, organizacion.nombre);
                // return utils.migrarOffset(consulta, q_limites, 100, insertCarpeta);
                return utils.migrar(consulta, q_limites, 10000, findUpdateCarpeta).then(() => {
                    logger('vuelve de migrar');
                    return db.close();
                    // mongodb.close();
                });
            }
        } else {
            logger('Código de organización inválido, verifica el codigo Sisa ingresado');
            return null;
        }
    } catch (err) {
        logger('Error al obtener la organización', err);
    }
}


