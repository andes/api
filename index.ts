import * as express from 'express';
import * as debug from 'debug';
import { initAPI } from './initialize';
import { Websockets } from './websockets';


// Inicializa express
let app = express();
initAPI(app);

// Inicia el servidor HTTP
let port = 3002;
let server = app.listen(3002, () => debug('andes')('listening on port %s', port));

// Inicializa Websockets
Websockets.initialize(server);


