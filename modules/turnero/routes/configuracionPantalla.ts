import * as express from 'express';
import * as mongoose from 'mongoose';
import { turneroPantallaModel } from '../schemas/turneroPantalla';
import { Auth } from '../../../auth/auth.class';

let router = express.Router();



router.get('/pantalla', async (req: any, res, next) => {
    let organizacion = Auth.getOrganization(req);

    let opciones = {
        organizacion:  mongoose.Types.ObjectId(organizacion)
    };

    if (req.query.nombre) {
        opciones['nombre'] = req.query.nombre;
    }

    try {
        let pantallas = await turneroPantallaModel.find(opciones);
        return res.json(pantallas);
    } catch (e) {
        return next(e);
    }
});

router.get('/pantalla/:id', (req: any, res, next) => {
    turneroPantallaModel.findById(req.params.id, (err, data) => {
        if (err) {
            return next(err);
        }
        return res.json(data);
    });
});


router.post('/pantalla/', (req: any, res, next) => {
    let pantallaData = req.body;

    let pantalla: any = new turneroPantallaModel(pantallaData);
    pantalla.token = Number(Math.random() * 1000000);
    pantalla.save((err2) => {
        if (err2) {
            return next(err2);
        }
        res.json(pantalla);
    });
});

router.patch('/pantalla/:id', (req, res, next) => {
    let id = req.params.id;
    let data = req.body;
    turneroPantallaModel.findByIdAndUpdate(id, data, { new: true }, (err, pantalla) => {
        if (err) {
            return next(err);
        }
        return res.json(pantalla);
    });
});

router.delete('/pantalla/:id', (req: any, res, next) => {
    turneroPantallaModel.findById(req.params.id, (err, data) => {
        if (err) {
            return next(err);
        } else if (data) {
            data.remove().then(() => {
                return res.json({message: 'OK'});
            });
        }
    });
});


module.exports = router;
