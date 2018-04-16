import * as express from 'express';
import * as debug from 'debug';
import { initAPI } from './initialize';
import { Websockets } from './websockets';


// Inicializa express
let app = express();
initAPI(app);

// Inicia el servidor HTTP
let port = 3002;
let server = app.listen(3002, () => debug('andes')('listening on port %s', port));
// let socketIO = require('socket.io');
// let io = socketIO(server);
// // const roomTotal = []


// io.on('connection', (socket) => {

//     console.log('user connected', socket.id);

//     socket.on('disconnect', function () {
//         if (io.dataRooms) {
//             io.dataRooms.forEach(element => {
//                 if (io.sockets.adapter.rooms[element.pantalla] === undefined) {

//                     var pantallasTotal = io.dataRooms;
//                     var index = pantallasTotal.findIndex(obj => obj.pantalla === element.pantalla);
//                     if (index !== -1) {
//                         io.dataRooms.splice(index, 1);
//                     }
//                 }
//             });
//         }
//     });
//     socket.on('room', function (room) {
//         let existe = false;
//         socket.join(room.pantalla);
//         // console.log(socket.dataRooms)
//         if (io.dataRooms) {
//             io.dataRooms.forEach(element => {
//                 if (element.pantalla === room.pantalla) {
//                     element.prestaciones = room.prestaciones;
//                     existe = true;
//                 }
//             });
//             if (existe === false) {
//                 io.dataRooms.push(room);
//             }

//         } else {
//             io.dataRooms = [room];
//         }


//         socket.data = 'hola';

//     });


//     socket.on('proximoNumero', (numero) => {
//         io.dataRooms.forEach(pantallas => {
//             pantallas.prestaciones.forEach(element => {
//                 if (element === numero.tipoPrestacion.conceptId) {
//                     io.sockets.in(pantallas.pantalla).emit('muestraTurno', numero);
//                 }
//             });
//         });

//         // roomTotal.splice(-1, 1);
//     });
// });



// Inicializa Websockets
Websockets.initialize(server);
