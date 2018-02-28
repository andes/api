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
let socketIO = require('socket.io');
let io = socketIO(server);
const roomTotal = []


io.on('connection', (socket) => {

    console.log('user connected', socket.id);

    socket.on('disconnect', function () {
        console.log('user disconnected');

        if (io.dataRooms) {
            io.dataRooms.forEach(element => {
                if (io.sockets.adapter.rooms[element.pantalla] === undefined) {

                    var pantallasTotal = io.dataRooms;
                    var index = pantallasTotal.findIndex(obj => obj.pantalla === element.pantalla)
                    if (index != -1) {
                        io.dataRooms.splice(index, 1);
                    }
                }
            })
        }
    });
    socket.on('room', function (room) {
        let existe = false;
        socket.join(room.pantalla);
        // console.log(socket.dataRooms)
        if (io.dataRooms) {
            io.dataRooms.forEach(element => {
                if (element.pantalla === room.pantalla) {
                    element.prestaciones = room.prestaciones;
                    existe = true;
                }
            });
            if (existe === false) {
                io.dataRooms.push(room);
            }

        } else {
            io.dataRooms = [room];
        }

        console.log(io.dataRooms);

        //socket.rooms.push(room)
        socket.data = "hola";
        console.log(socket.rooms);

    });


    socket.on('proximoNumero', (numero) => {
        io.dataRooms.forEach(pantallas => {
            pantallas.prestaciones.forEach(element => {
                if (element === numero.tipoPrestacion.conceptId) {
                    console.log("entro");
                    io.sockets.in(pantallas.pantalla).emit('muestraTurno', numero);
                }
            });

            // io.sockets.in(element).emit('pantalla_1', 'what is going on, party people?');
        });

        // console.log(datos)
        // let prestaciones = datos.prestaciones;
        // prestaciones.forEach(element => {
        //     console.log(element)
        //     if(element === numero.tipoPrestacion.conceptId){
        //         console.log("entro")
        //         io.emit(datos.pantalla, numero);
        //     }

        // });
        // io.emit(socket.handshake.query.pantalla, numero);
        roomTotal.splice(-1, 1);
    });
});


// io.on('connection', (socket) => {
//     let datos;
//     console.log('user connected', socket.id );
//     socket.on('disconnect', function () {
//     console.log('user disconnected');
//     });

//     socket.on('datosPantalla', (numero) => {
//        console.log(numero);
//        datos = numero;
//    });
//     socket.on('proximoNumero', (numero) => {
//         console.log(datos)
//         let prestaciones = datos.prestaciones;
//         prestaciones.forEach(element => {
//             console.log(element)
//             if(element === numero.tipoPrestacion.conceptId){
//                 console.log("entro")
//                 io.emit(datos.pantalla, numero);
//             }

//         });
//         // io.emit(socket.handshake.query.pantalla, numero);
//     });
// });


// Inicializa Websockets
Websockets.initialize(server);
