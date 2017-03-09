import * as express from 'express';
import * as log from '../../../core/log/schemas/log';
let router = express.Router();

router.post('/log/', function (req, res, next) {
    let newLog = new log(req.body);
    newLog.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newLog);
    });
});
