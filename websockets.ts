import * as ws from 'ws';
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
        const wss = new ws.Server({ server });
        console.log('[Websockets] Open');

        // When client connects ...
        wss.on('connection', (ws: any, req) => {
            console.log('[Websockets] Client connected ', (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

            // Init keep-alive
            ws.isAlive = true;
            ws.on('pong', () => {
                console.log('pong');
                ws.isAlive = true;
            });


            // const location = url.parse(req.url, true);
            // You might use location.query.access_token to authenticate or share sessions
            // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
            // Init message handler
            ws.on('message', (message) => {
                ws.send(JSON.stringify({ echo: message }));
            });
        });

        // Keep-alive connections
        setInterval(function ping() {
            wss.clients.forEach((ws: any) => {
                if (ws.isAlive === false) {
                    return ws.terminate();
                }
                ws.isAlive = false;
                ws.ping('', false, true);
            });
        }, 5000);
    }
}
