import * as express from 'express';
import * as mongoose from 'mongoose';
import { connection } from './../../../connectMpi';

let router = express.Router();

router.get('/', function (req, res, next) {
    res.json({
        API: 'OK',
        DB: mongoose.connection.readyState !== 1 ? 'Error' : 'OK',
        MPI: connection.readyState !== 1 ? 'Error' : 'OK',
    });
});

module.exports = router;
