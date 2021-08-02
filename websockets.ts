import { EventSocket } from '@andes/event-bus';
import * as debug from 'debug';
import { Server } from 'http';
import { Auth } from './auth/auth.class';
import { RedisWebSockets } from './config.private';

let log = debug('websocket');

export class Packet {
    private io;
    private socket;
    public event: String;
    public data: any;
    public user: any;

    constructor(io, socket, event, data) {
        this.io = io;
        this.socket = socket;
        this.event = event;
        this.data = data;
        this.user = socket.user;
    }

    broadcast(event, data) {
        this.socket.emit(event, data);
    }

    toRoom(room, event, data) {
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

    static onAuth(socket, token) {

        let user = Auth.validateToken(token);
        if (user) {
            socket.user = user;

            // Automaticamente agregamos al usuario a ciertos rooms.
            switch (user.type) {
                case 'user-token':
                    socket.join(`user-${user.usuario.id}`);
                    break;
                case 'turnero-token':
                    socket.join(`turnero-pantalla-${user.app.id}`);
                    break;
                case 'paciente-token':
                    for (let paciente of user.pacientes) {
                        socket.join(`paciente-${paciente.id}`);
                    }
                    break;
                default:
                    socket.emit('auth', { status: 'error' });
                    return null;
            }
            socket.emit('auth', { status: 'ok' });
        } else {

            socket.emit('auth', { status: 'error' });
        }
    }

    static onRoom(socket, { name }) {
        if (name) {
            switch (name) {
                case 'turnero':
                    if (socket.user.organizacion) {
                        socket.join(`turnero-${socket.user.organizacion._id}`);
                    }
                    break;
                default:
                    socket.join(name);
                    break;
            }
        }
    }

    static onLeave(socket, { name }) {
        if (name) {
            switch (name) {
                case 'turnero':
                    if (socket.user.organizacion) {
                        socket.leave(`turnero-${socket.user.organizacion._id}`);
                    }
                    break;
                default:
                    socket.leave(name);
                    break;
            }
        }
    }

    static broadcast(event, data) {
        this.io.emit(event, data);
    }

    static toRoom(room, event, data) {
        this.io.to(room).emit(event, data);
    }

    static initialize(server: Server) {
        log('Websocket start');
        let redis = require('socket.io-redis');
        let socketIO = require('socket.io');
        this.io = socketIO(server, { path: '/ws', transports: ['websocket', 'polling'] });
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
                    case 'room':
                        this.onRoom(socket, data);
                        break;
                    case 'leave':
                        this.onLeave(socket, data);
                        break;
                    default:
                        let p = new Packet(this.io, socket, event, data);
                        EventSocket.emitAsync(event, p);
                        break;
                }
                next();

            });

            socket.on('disconnect', () => {
                log('onDisconnect');
            });
        });
    }
}

