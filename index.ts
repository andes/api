import * as express from 'express';
import * as debug from 'debug';
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
if (process.env.NODE_ENV !== 'production') {
    // tslint:disable-next-line:no-console
    process.on('unhandledRejection', r => console.log(r));
}
