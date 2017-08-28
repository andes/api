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
        const wss = new ws.Server({ server });
        let log = debug('websockets');
        log('open');

        // When client connects ...
        wss.on('connection', (socket: any, req) => {
            log('connected %s', (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

            // Init keep-alive
            socket.isAlive = true;
            socket.on('pong', () => {
                log('pong');
                socket.isAlive = true;
            });

            // const location = url.parse(req.url, true);
            // You might use location.query.access_token to authenticate or share sessions
            // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
            // Init message handler
            socket.on('message', (message) => {
                socket.send(JSON.stringify({ echo: message }));
            });
        });

        // Keep-alive connections
        setInterval(function ping() {
            wss.clients.forEach((socket: any) => {
                if (socket.isAlive === false) {
                    return socket.terminate();
                }
                socket.isAlive = false;
                socket.ping('', false, true);
            });
        }, 5000);
    }
}
