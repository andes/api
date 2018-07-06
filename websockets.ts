import { Server } from 'http';
import * as debug from 'debug';
import { Auth } from './auth/auth.class';
import { RedisWebSockets } from './config.private';

import { EventSocket } from '@andes/event-bus';

let log = debug('websocket');

class Packet {
    private io;
    private socket;
    public event: String;
    public data: any;
    public user: any;

    constructor (io, socket, event, data) {
        this.io = io;
        this.socket = socket;
        this.event = event;
        this.data = data;
        this.user = socket.user;
    }

    broadcast (event, data) {
        this.socket.emit(event, data);
    }

    toRoom (room, event, data) {
        this.socket.to(room).emit(event, data);
    }
}


export class Websockets {
    static io;
    /**
     * Inicializa el servicio de websockets
     *
     * @static
     * @param {express.Express} app aplicación de Express
     *
     * @memberOf Auth
     */

    static onAuth (socket, token) {
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
    }

    static broadcast (event, data) {
        this.io.emit(event, data);
    }

    static toRoom (room, event, data) {
        this.io.to(room).emit(event, data);
    }

    static initialize(server: Server) {
        log('Websocket start');
        var redis = require('socket.io-redis');
        let socketIO = require('socket.io');
        this.io = socketIO(server);
        if (RedisWebSockets.active) {
            this.io.adapter(redis({ host: RedisWebSockets.host, port: RedisWebSockets.port }));
        }

        this.io.on('connection', (socket) => {
            log('onConnection');
            socket.use((packet, next) => {
                // Handler
                let [event, data] = packet;
                log(event, data);

                switch (event) {
                    case 'auth':
                        let token = data.token;
                        this.onAuth(socket, token);
                        break;

                    default:
                        let p = new Packet(this.io, socket, event, data);
                        EventSocket.emitAsync(event, p);
                        break;
                }
                next();

              });

            socket.on('disconnect', function () {
                // console.log('Disconnected');
            }); 
        });
    }
}

