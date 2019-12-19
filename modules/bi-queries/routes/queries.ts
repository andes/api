import * as express from 'express';
import { EventCore } from '@andes/event-bus';

let router = express.Router();

router.get('/biQueries', async (req, res, next) => {
    console.log("Entra a biqueries");
    let pepe = 'Capoooo';
    EventCore.emitAsync('queries:consultas:getQueries', pepe);

    res.json({ message: 'Enviado a bi queries' });
});


export = router;
