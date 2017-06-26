import { pacienteApp } from '../schemas/pacienteApp';
import * as express from 'express';

let router = express.Router();

router.get('/app', function (req, res, next) {

    console.log("Entra a Pacientess desde adentro");

    pacienteApp.find(function (err, data) {
        if (err) {
            next(err);
        };
        res.json(data);
    });

});

export = router;