import * as express from 'express';
import { Connections } from './../../../connections';

let router = express.Router();

router.get('/', function (req, res, next) {
    res.json({
        API: 'OK',
        DB: Connections.main.readyState !== 1 ? 'Error' : 'OK',
        MPI: Connections.mpi.readyState !== 1 ? 'Error' : 'OK',
    });
});

module.exports = router;
