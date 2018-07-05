import * as ws from 'ws';
import { Server } from 'http';
import * as debug from 'debug';

export class Websockets {
    /**
     * Inicializa el servicio de websockets
     *
     * @static
     * @param {express.Express} app aplicación de Express
     *
     * @memberOf Auth
     */
    static initialize(server: Server) {
        //     const wss = new ws.Server({ server });
        let socketIO = require('socket.io');
        let io = socketIO(server);
        // const roomTotal = []


        io.on('connection', (socket) => {

           // console.log('user connected', socket.id);

            socket.on('disconnect', function () {
                if (io.dataRooms !== undefined) {
                    io.dataRooms.forEach(element => {
                        if (io.sockets.adapter.rooms[element.pantalla] === undefined) {

                            var pantallasTotal = io.dataRooms;
                            var index = pantallasTotal.findIndex(obj => obj.pantalla === element.pantalla);
                            if (index !== -1) {
                                io.dataRooms.splice(index, 1);
                            }
                        }
                    });
                }
            });
            socket.on('room', function (room) {
                let existe = false;
                socket.join(room.pantalla);
                // console.log(socket.dataRooms)
                if (io.dataRooms !== undefined) {
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


                socket.data = 'hola';

            });


            socket.on('proximoNumero', (numero) => {
                if (io.dataRooms !== undefined) {

                    io.dataRooms.forEach(pantallas => {
                        pantallas.prestaciones.forEach(element => {
                            if (element === numero.tipoPrestacion.conceptId) {
                                io.sockets.in(pantallas.pantalla).emit('muestraTurno', numero);
                            }
                        });
                    });
                }
                // roomTotal.splice(-1, 1);
            });
        });
    }
}

