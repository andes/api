import * as express from 'express';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { turneroPantallaModel } from '../schemas/turneroPantalla';
import { Auth } from '../../../auth/auth.class';

let router = express.Router();

router.get('/pantalla', Auth.authenticate(), async (req: any, res, next) => {
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

router.get('/pantalla/:id', Auth.authenticate(), (req: any, res, next) => {
    turneroPantallaModel.findById(req.params.id, (err, data) => {
        if (err) {
            return next(err);
        }
        return res.json(data);
    });
});

export function generarToken() {
    let codigo = '';
    let length = 6;
    let caracteres = '0123456789';
    for (let i = 0; i < length; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

router.post('/pantalla/', Auth.authenticate(), (req: any, res, next) => {
    let pantallaData = req.body;
    let organizacion = Auth.getOrganization(req);

    let pantalla: any = new turneroPantallaModel(pantallaData);

    pantalla.organizacion = mongoose.Types.ObjectId(organizacion);
    pantalla.token = generarToken();
    pantalla.expirationTime = moment().add(1, 'hours').toDate();

    pantalla.save((err2) => {
        if (err2) {
            return next(err2);
        }
        res.json(pantalla);
    });
});

router.post('/pantalla/:id/retoken', Auth.authenticate(), (req: any, res, next) => {
    let id = req.params.id;
    let organizacion = Auth.getOrganization(req);
    let query = {
        _id: mongoose.Types.ObjectId(id),
        organizacion:  mongoose.Types.ObjectId(organizacion)
    };
    turneroPantallaModel.find(query, (err, pantallas: any[]) => {
        if (err) {
            return next(err);
        }
        if (pantallas.length) {
            let pantalla = pantallas[0];
            pantalla.token = generarToken();
            pantalla.expirationTime = moment().add(1, 'hours').toDate();
            return pantalla.save().then(() => {
                return res.json(pantalla);
            });
        }
        return next(422);
    });


});

router.patch('/pantalla/:id', Auth.authenticate(), (req, res, next) => {
    let id = req.params.id;
    let data = req.body;
    turneroPantallaModel.findByIdAndUpdate(id, data, { new: true }, (err, pantalla) => {
        if (err) {
            return next(err);
        }
        return res.json(pantalla);
    });
});

router.delete('/pantalla/:id', Auth.authenticate(), (req: any, res, next) => {
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

router.post('/pantalla/activate', async (req, res, next) => {
    let codigo = req.body.codigo;
    let pantallas = await turneroPantallaModel.find({
        token: codigo,
        expirationTime: { $gt: new Date() },
    });
    if (pantallas.length) {
        let pantalla: any = pantallas[0];
        pantalla.token = null;
        pantalla.expirationTime = null;
        await pantalla.save();

        let token = Auth.generateAppToken(String(pantalla._id), {} , [`turnero:${pantalla._id}`]);
        return res.send({ token });
    }
    return next({message: 'no eiste pantalla'});
});

module.exports = router;
