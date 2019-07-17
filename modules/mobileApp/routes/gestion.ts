import * as express from 'express';
const request = require('request');

const router = express.Router();
const urlGestion = 'http://10.1.192.244:3005/mobile/migrar';
// const urlGestion = 'http://192.168.0.121:3000/mobile/migrar';

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
