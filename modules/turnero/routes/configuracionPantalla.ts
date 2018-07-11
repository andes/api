import * as express from 'express';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { turneroPantallaModel } from '../schemas/turneroPantalla';
import { Auth } from '../../../auth/auth.class';
import { EventSocket } from '@andes/event-bus';
import { Packet, Websockets } from '../../../websockets';

const ObjectId = mongoose.Types.ObjectId;
let router = express.Router();

router.get('/pantalla', Auth.authenticate(), async (req: any, res, next) => {
    let organizacion = Auth.getOrganization(req);

    let opciones = {
        organizacion:  ObjectId(organizacion)
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

    pantalla.organizacion = ObjectId(organizacion);
    pantalla.token = generarToken();
    pantalla.expirationTime = moment().add(1, 'hours').toDate();

    pantalla.save((err2) => {
        if (err2) {
            return next(err2);
        }
        res.json(pantalla);
        Websockets.toRoom(`turnero-${pantalla.organizacion}`, 'turnero-create', { pantalla });
    });
});

router.post('/pantalla/:id/retoken', Auth.authenticate(), (req: any, res, next) => {
    let id = req.params.id;
    let organizacion = Auth.getOrganization(req);
    let query = {
        _id: ObjectId(id),
        organizacion:  ObjectId(organizacion)
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
    turneroPantallaModel.findByIdAndUpdate(id, data, { new: true }, (err, pantalla: any) => {
        if (err) {
            return next(err);
        }
        res.json(pantalla);
        Websockets.toRoom(`turnero-${pantalla.organizacion}`, 'turnero-update', { pantalla });
    });
});

router.delete('/pantalla/:id', Auth.authenticate(), (req: any, res, next) => {
    turneroPantallaModel.findById(req.params.id, (err, data: any) => {
        if (err) {
            return next(err);
        } else if (data) {
            data.remove().then(() => {
                res.json({message: 'OK'});
                Websockets.toRoom(`turnero-${data.organizacion}`, 'turnero-remove', { id: data._id });
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


        let token = Auth.generateAppToken(pantalla, {} , [`turnero:${pantalla._id}`], 'turnero-token');
        res.send({ token });

        Websockets.toRoom(`turnero-${pantalla.organizacion}`, 'turnero-activated', { id: pantalla.id });

    }
    return next({message: 'no eiste pantalla'});
});


EventSocket.on('turnero-proximo-llamado', (paquete: Packet) => {
    const turno = paquete.data;
    const espacioFisico =  ObjectId(turno.espacioFisico.id);

    turneroPantallaModel.find({
        'espaciosFisicos.id': espacioFisico
    }).then((pantallas) => {
        pantallas.forEach((pantalla) => {
            let id = pantalla.id;
            paquete.toRoom(`turnero-pantalla-${id}`, 'mostrar-turno', turno);
        });
    }).catch((e) => {

    });
});

module.exports = router;
