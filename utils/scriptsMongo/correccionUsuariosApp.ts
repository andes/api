import { paciente } from './../../core/mpi/schemas/paciente';
import * as pacienteCTR from './../../core/mpi/controller/paciente';
import { Matching } from '@andes/match';
import { pacienteApp } from './../../modules/mobileApp/schemas/pacienteApp';
import * as authController from './../../modules/mobileApp/controller/AuthController';
import * as mongoose from 'mongoose';
import * as configuraciones from './../../config.private';

mongoose.connect(configuraciones.hosts.mongoDB_main.host, { auth: configuraciones.hosts.mongoDB_main.auth, server: configuraciones.hosts.mongoDB_main.server });
var conn = mongoose.connection;

// conn.once('open', function () {
//     console.log('test');
//     let cursor = pacienteApp.find({ pacientes: { $size: 1 } }).cursor();
//     cursor.on('close', function () { // Si no lo encontró, devuelvo el paciente
//         console.log('close');
//         conn.close();
//     });
//     cursor.on('data', async function (account) {
//         if (account.pacientes && account.pacientes.length > 0) {
//             let data = {
//                 nombre: account.nombre,
//                 apellido: account.apellido,
//                 documento: account.documento,
//                 fechaNacimiento: account.fechaNacimiento,
//                 genero: account.sexo
//             };

//             await authController.matchPaciente(data).then((resultado: any) => {
//                 console.log('Paciente App a matchear: ', data, account.pacientes[0]._id);
//                 if (resultado.length) {
//                     let pacienteTemp = resultado[0].paciente;
//                     console.log('Paciente a vincular: ', pacienteTemp.id, pacienteTemp.apellido, pacienteTemp.nombre, pacienteTemp.sexo);
//                     account.pacientes = [
//                         {
//                             id: pacienteTemp.id,
//                             relacion: 'principal',
//                             addedAt: new Date()
//                         }
//                     ];
//                 } else {
//                     console.log('No encontro paciente a vincular: ');
//                     account.pacientes = [];
//                 }
//                 // account.save();
//             });
//         }
//     });
// });
