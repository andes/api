import * as express from 'express';
import * as cambioDni from '../schemas/cambioDni';
const router = express.Router();

router.get('/cambioDni', (req, res, next) => {

    cambioDni.find((err, data) => {
        if (err) {
            next(err);
        }

        res.status(201).json(data);
    });

});


router.post('/cambioDni', (req, res, next) => {
    // if (!Auth.check(req, 'matriculaciones:agenda:postAgenda')) {
    //     return next(403);
    // }
    if (req.body.id) {
        cambioDni.findByIdAndUpdate(req.body.id, req.body, {
            new: true
        }, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {

        const newCambio = new cambioDni(req.body);
        newCambio.save((err) => {
            if (err) {
                return next(err);
            }
            res.status(201).json(newCambio);
        });

    }

});


export = router;
