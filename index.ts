import * as debug from 'debug';
import * as express from 'express';
import './apm';
import { initAPI } from './initialize';
import { Websockets } from './websockets';

// Inicializa express
const app = express();
initAPI(app);

// Inicia el servidor HTTP
const port = 3002;
const server = app.listen(3002, () => debug('andes')('listening on port %s', port));

// Inicializa Websockets
Websockets.initialize(server);

// Muestra mensaje y línea de un error dentro de una promise ;-)
process.on('unhandledRejection', r => debug('andes')(r));
process.on('uncaughtException', r => debug('andes')(r));

/**
 * Gracefull shutdown
 */

process.on('SIGINT', () => {
    debug('andes')('gracefull shutdown');
    server.close(() => {
        setTimeout(
            () => {
                const { Connections } = require('./connections');
                Connections.main.close().then(() => {
                    process.exit();
                });
            }
            , 500
        );
    });
});
