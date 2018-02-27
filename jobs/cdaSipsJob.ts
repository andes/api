import * as labsImport from '../modules/cda/controller/import-labs';
import { paciente as Paciente, pacienteMpi as PacienteMPI} from '../core/mpi/schemas/paciente';
import * as moment from 'moment';
import { Logger } from '../utils/logService';
import { log } from '../core/log/schemas/log';
import * as config from '../config.private';
import * as debug from 'debug';
import * as mongoose from 'mongoose';
import { pacienteApp as PacienteApp } from '../modules/mobileApp/schemas/pacienteApp';

function run() {
    let logger = debug('cdaSipsJob');

    log.find({
        'modulo': 'scheduler',
        'operacion': 'cda'
    }).sort({ fecha: -1 }).limit(1).then((docs) => {
        let skip = 0;
        let limit = 4;

        // if (docs.length) {
        //     let l: any = docs[0];
        //     if (l.datosOperacion.status === 'end') {
        //         return;
        //     }
        //     skip = l.datosOperacion.skip + limit;
        // }

        PacienteApp.find({
            activacionApp: true
        }).then((cuentas) => {
            // let ids = [ mongoose.Types.ObjectId('586e6e8627d3107fde116357') ];
            let ids = [];
            cuentas.forEach((c: any) => {
                if (c.pacientes && c.pacientes[0] && c.pacientes[0].id) {
                    ids.push(c.pacientes[0].id);
                }
            });
            // let _stream = Paciente.find({ estado: 'validado' }, {nombre: 1, apellido: 1, fechaNacimiento: 1, documento: 1, sexo: 1});

            let _stream = PacienteMPI.find({ _id:  { $in: ids }}, {nombre: 1, apellido: 1, fechaNacimiento: 1, documento: 1, sexo: 1}); // .skip(skip).limit(limit);
            _stream.then( async (pacientes: any[]) => {

                logger('Start with skip=' + skip);
                for (let pac of pacientes) {
                    let result = await labsImport.importarDatos(pac);
                    if (!result) {
                        return;
                    }
                }
                logger('Stop  with skip=' + skip);

                // if (pacientes.length) {
                //     Logger.log(config.userScheduler, 'scheduler', 'cda', { limit, skip });
                // } else {
                //     Logger.log(config.userScheduler, 'scheduler', 'cda', { limit, skip, status: 'end' });
                // }


            });

        });



    });
}

// function run() {
//     let logger = debug('cdaSipsJob');
//     log.find({
//         'modulo': 'scheduler',
//         'operacion': 'cda'
//     }).sort({ fecha: -1 }).limit(1).then((docs) => {
//         let skip = 0;
//         let limit = 40;

//         if (docs.length) {
//             let l: any = docs[0];
//             if (l.datosOperacion.status === 'end') {
//                 return;
//             }
//             skip = l.datosOperacion.skip + limit;
//         }
//         let _stream = PacienteMPI.find({}, {nombre: 1, apellido: 1, fechaNacimiento: 1, documento: 1, sexo: 1}).skip(skip).limit(limit);
//         _stream.then( async (pacientes: any[]) => {
//             if (pacientes.length) {
//                 Logger.log(config.userScheduler, 'scheduler', 'cda', { limit, skip });
//             } else {
//                 Logger.log(config.userScheduler, 'scheduler', 'cda', { limit, skip, status: 'end' });
//             }

//             for (let pac of pacientes) {
//                 await labsImport.importarDatos(pac);
//             }

//         });

//     });
// }

export = run;
