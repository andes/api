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

// router.post('/organizacionesCache', function (req, res, next) {

//     let options = {
//         ...(req.body.provincia) && { 'provincia': req.body.provincia },
//         ...(req.body.dependencia) && { 'dependencia': req.body.dependencia },
//         ...(req.body.origenDeFinanciamiento) && { 'origenDeFinanciamiento': req.body.origenDeFinanciamiento }
//     };

//     /**
//      * Esto era para el scheduler, en lanin no lo necesitamos
//      */
//     // servicioSisa.getOrganizacionesSisa(configPrivate.sisa.username, configPrivate.sisa.password, options);

// });

export = router;
