import * as express from 'express';
import * as organizacionCache from '../schemas/organizacionCache';

const router = express.Router();

router.get('/organizacionesCache', (req, res, next) => {

    let query;

    query = organizacionCache.organizacionCache.find({}, {
        coordenadasDeMapa: 1,
        nombre: 1,
        localidad: 1,
        domicilio: 1,
        telefono: 1
    });
    query.exec((err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
