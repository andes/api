import * as mongoose from 'mongoose';
import * as utils from './utils';
import * as config from './config';
import * as mongodb from 'mongodb';
import * as sql from 'mssql';
import * as organizacionSchema from '../../../../core/tm/schemas/organizacion';


var db;
var organizacion;

function abrirConexion(url) {
    return mongodb.MongoClient.connect(url);
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
                            return c.nroCarpeta = paciente['historiaClinica']
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
                console.log('nuevo', documentoPaciente);
                return insert('carpetaPaciente', {
                    'documento': documentoPaciente,
                    'carpetaEfectores': [carpetaNueva]
                });

            }
        });
};

export function migrar() {
    console.log('Migrando carpetas de pacientes');
    let q_limites = `select MIN(PAC.idPaciente) as min, COUNT(PAC.idPaciente) as max from
    dbo.sys_paciente as PAC inner join dbo.Sys_RelHistoriaClinicaEfector AS rhe ON rhe.idPaciente = pac.idPaciente
     WHERE PAC.activo = 1` + ' AND rhe.idEfector=' + config.organizacionSips.idSips;
    new sql.connect(config.dbMssql).then(base => {
        // abrirConexion(config.urlMongoAndes).then(base => {
        db = base;
        // Se busca la organización de la que se van a migrar las carpetas de pacientes
        console.log('codigo ', config.organizacionSips.codigoSisa);
        
        organizacionSchema.model.find({ 'codigo.sisa': config.organizacionSips.codigoSisa }, function (err, efectores: any[]) {
            console.log('model');
            if (efectores && efectores.length) {
                console.log('Se actualizarán las carpetas de los pacientes desde SIPS de ', efectores[0].nombre);
                organizacion = efectores[0];
                if (config.organizacionSips.idSips) {
                    // let consulta = config.consultaPacienteSipsHC + ' AND efector.idEfector=' + config.organizacionSips.idSips + ' AND PAC.idPaciente between @offset and @limit';
                    let consulta = config.consultaCarpetaPacienteSips + ' AND rhe.idEfector=' + config.organizacionSips.idSips;
                    console.log('EFECTOR', config.organizacionSips.idSips, organizacion.nombre);
                    // return utils.migrarOffset(consulta, q_limites, 100, insertCarpeta);
                    return utils.migrar(consulta, q_limites, 10000, findUpdateCarpeta).then(() => {
                        console.log('vuelve de migrar');
                        return db.close();
                        // mongodb.close();
                    });
                }
            } else {
                console.log('Código de organización inválido, verifica el codigo Sisa ingresado');
            }
            if (err) {
                console.log('Error al obtener la organización', err);
            }
        });
    });

}
