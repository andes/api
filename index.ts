import * as debug from 'debug';
import * as express from 'express';
import './apm';
import { initAPI } from './initialize';
import { closePdfBrowser } from './utils/pdf/puppeteer';
import { Websockets } from './websockets';

// Inicializa express
const app = express();
initAPI(app);

// Inicia el servidor HTTP
const port = 3002;
const server = app.listen(3002, () => debug('andes')('listening on port %s', port));
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 61 * 1000;
// Inicializa Websockets
Websockets.initialize(server);

// Muestra mensaje y línea de un error dentro de una promise ;-)
process.on('unhandledRejection', r => debug('andes')(r));
process.on('uncaughtException', r => debug('andes')(r));

const configuredShutdownTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS);
const shutdownTimeoutMs = Number.isFinite(configuredShutdownTimeout) && configuredShutdownTimeout > 0
    ? configuredShutdownTimeout : 8_000;
let shuttingDown = false;

async function shutdown(signal: string) {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    debug('andes')('graceful shutdown: %s', signal);

    const timeout = setTimeout(() => process.exit(1), shutdownTimeoutMs);
    let exitCode = 0;

    try {
        // Socket.IO cierra también el servidor HTTP y espera las solicitudes activas.
        await new Promise<void>((resolve, reject) => {
            Websockets.io.close((error) => error ? reject(error) : resolve());
        });
    } catch (error) {
        debug('andes')('error closing HTTP server: %O', error);
        exitCode = 1;
    }

    try {
        await closePdfBrowser();
    } catch (error) {
        debug('andes')('error closing PDF browser: %O', error);
        exitCode = 1;
    }

    try {
        const { Connections } = require('./connections');
        await Connections.main.close();
    } catch (error) {
        debug('andes')('error closing MongoDB: %O', error);
        exitCode = 1;
    }

    clearTimeout(timeout);
    process.exit(exitCode);
}

process.on('SIGINT', () => { shutdown('SIGINT'); });
process.on('SIGTERM', () => { shutdown('SIGTERM'); });
