import * as express from 'express';
import { MongoClient } from 'mongodb';
import * as async from 'async';
import * as config from '../../../config';

let router = express.Router();

router.get('/', function (req, res, next) {
    async.parallel(
        // Llamadas asincrónicas
        {
            DB: (callback) => MongoClient.connect(config.connectionStrings.mongoDB_main, (err) => callback(null, err)),
            MPI: (callback) => MongoClient.connect(config.connectionStrings.mongoDB_mpi, (err) => callback(null, err)),
        },
        // Cuando todas terminan ...
        (err, results) => res.json({
            API: 'OK',
            DB: results.DB ? 'Error' : 'OK',
            MPI: results.MPI ? 'Error' : 'OK',
        })
    );
});

module.exports = router;
