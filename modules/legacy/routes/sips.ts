import * as express from 'express';
import {
    agendaSipsCache
} from '../schemas/agendaSipsCache';

let router = express.Router();

/* Por el momento sin uso */

router.post('/sips', function (req: any, res, next) {

    let newData = new agendaSipsCache(req.body.params);

    return newData.save(function (error) {
        if (error) {
            return next(error);
        }
        return res.json({ message: 'OK' });
    });
});
module.exports = router;
