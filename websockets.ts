import { Server } from 'http';
import * as debug from 'debug';
import { Auth } from './auth/auth.class';

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

            socket.on('disconnect', function () {

            });

            socket.on('auth', (data) => {
                let token = data.token;
                let user = Auth.validateToken(token);
                if (user) {
                    socket.user = user;
                    socket.emit('auth', { status: 'ok' });
                    // [TODO] Ver si es turnero u otro servicio
                    if (user.type === 'app-token') {
                        socket.join(`turnero-pantalla-${user.app.nombre}`);
                    } else {
                        // console.log(user.usuario);
                    }
                } else {
                    socket.emit('auth', { status: 'error' });
                }
            });

            socket.on('turnero-proximo-llamado', (turno) => {
                console.log(turno);
                io.sockets.emit('muestraTurno', turno)
            });


            // socket.on('proximoNumero', (numero) => {
            //     if (io.dataRooms !== undefined) {

            //         io.dataRooms.forEach(pantallas => {
            //             pantallas.prestaciones.forEach(element => {
            //                 if (element === numero.tipoPrestacion.conceptId) {
            //                     io.sockets.in(pantallas.pantalla).emit('muestraTurno', numero);
            //                 }
            //             });
            //         });
            //     }
            //     // roomTotal.splice(-1, 1);
            // });
        });
    }
}

