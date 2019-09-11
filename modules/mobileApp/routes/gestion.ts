import * as express from 'express';
import { urlDatosGestion } from '../../../config.private';
const request = require('request');

const router = express.Router();
const urlGestion = urlDatosGestion;


router.get('/datosGestion/', (req, res, next) => {
    let options = {
        method: 'GET',
        uri: urlGestion,
        body: {},
        json: true,
        timeout: 10000,
    };
    request(options, (error, response, _body) => {
        if (error) {
            return next(error);
        }
        res.json(_body);
    });

});

export = router;
