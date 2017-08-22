import * as express from 'express';
import { initAPI } from './initialize';
import { Websockets } from './websockets';


// Inicializa express
let app = express();
initAPI(app);

// Inicia el servidor HTTP
let server = app.listen(3002, function () {
    console.log('[API] Escuchando en http://localhost:/3002');
});

// Inicializa Websockets
Websockets.initialize(server);


