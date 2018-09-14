import { Server } from 'http';

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
        const socketIO = require('socket.io');
        const io = socketIO(server);
        // const roomTotal = []


        io.on('connection', (socket) => {

           // console.log('user connected', socket.id);

            socket.on('disconnect', () => {
                if (io.dataRooms !== undefined) {
                    io.dataRooms.forEach(element => {
                        if (io.sockets.adapter.rooms[element.pantalla] === undefined) {

                            const pantallasTotal = io.dataRooms;
                            const index = pantallasTotal.findIndex(obj => obj.pantalla === element.pantalla);
                            if (index !== -1) {
                                io.dataRooms.splice(index, 1);
                            }
                        }
                    });
                }
            });
            socket.on('room', (room) => {
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


        // LO QUE ESTABA ANTES EN WEBSOCKETS.INITIALIZE
        //     const wss = new ws.Server({ server });
        //     let log = debug('websockets');
        //     log('open');

        //     // When client connects ...
        //     wss.on('connection', (socket: any, req) => {
        //         log('connected %s', (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

        //         // Init keep-alive
        //         socket.isAlive = true;
        //         socket.on('pong', () => {
        //             log('pong');
        //             socket.isAlive = true;
        //         });

        //         // const location = url.parse(req.url, true);
        //         // You might use location.query.access_token to authenticate or share sessions
        //         // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
        //         // Init message handler
        //         socket.on('message', (message) => {
        //             socket.send(JSON.stringify({ echo: message }));
        //         });
        //     });

        //     // Keep-alive connections
        //     setInterval(function ping() {
        //         wss.clients.forEach((socket: any) => {
        //             if (socket.isAlive === false) {
        //                 return socket.terminate();
        //             }
        //             socket.isAlive = false;
        //             socket.ping('', false, true);
        //         });
        //     }, 5000);
        // }
    }
}

