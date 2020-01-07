import * as express from 'express';

const request = require('request');

let router = express.Router();

router.get('/biQueries', async (req, res, next) => {
    let url = 'http://localhost:3000/';
    let resp: any;
    let options = {
        method: 'POST',
        uri: `${url}queries/obtenerQueries`,
        body: {
            event: 'queries:consultas:getQueries',
            data: ''
        },
        json: true,
        timeout: 10000,
    };
    request(options, async (error, response, _body) => {
        if (error) {
            return next(error);
        }
        res.send(_body);
    });
});
router.post('/descargarCSV', async (req, res, next) => {
    let url = 'http://localhost:3000/';
    let resp: any;
    let options = {
        method: 'POST',
        uri: `${url}queries/descargarCsv`,
        body: {
            event: 'queries:consultas:getCsv',
            data: req.body.params
        },
        json: true,
        timeout: 10000,
    };
    request(options, async (error, response, _body) => {
        if (error) {
            return next(error);
        }
        res.send(_body);
    });
});

export = router;
