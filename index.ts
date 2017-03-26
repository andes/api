import * as express from 'express';
import { initAPI } from './initialize';

// Inicializa express
let app = express();
initAPI(app);

// Inicia el servidor
app.listen(3002, function () {
    console.log('[API] Escuchando en http://localhost:/3002');
});
export = app;
