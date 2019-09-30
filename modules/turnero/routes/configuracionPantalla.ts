import * as express from 'express';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { TurneroPantallaModel } from '../schemas/turneroPantalla';
import { Auth } from '../../../auth/auth.class';
import { EventSocket, EventCore } from '@andes/event-bus';
import { Packet, Websockets } from '../../../websockets';

const ObjectId = mongoose.Types.ObjectId;
const router = express.Router();

// router.use('/pantalla', Auth.authenticate());

router.get('/pantalla', Auth.authenticate(), async (req: any, res, next) => {
    try {
        let organizacion = Auth.getOrganization(req);
        let opciones = {
            organizacion: ObjectId(organizacion)
        };

        if (req.query.nombre) {
            opciones['nombre'] = req.query.nombre;
        }

        let pantallas = await TurneroPantallaModel.find(opciones);
        return res.json(pantallas);
    } catch (e) {
        return next(e);
    }
});

router.get('/pantalla/:id', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const pantalla = await TurneroPantallaModel.findById(req.params.id);
        return res.json(pantalla);
    } catch (err) {
        return next(err);
    }
});

export const generarToken = () => {
    let codigo = '';
    let length = 6;
    let caracteres = '0123456789';
    for (let i = 0; i < length; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
};

router.post('/pantalla', Auth.authenticate(), async (req: any, res, next) => {
    try {
        let pantallaData = req.body;
        let organizacion = Auth.getOrganization(req);

        let pantalla: any = new TurneroPantallaModel(pantallaData);

        pantalla.organizacion = ObjectId(organizacion);
        pantalla.token = generarToken();
        pantalla.expirationTime = moment().add(1, 'hours').toDate();

        await pantalla.save();
        res.json(pantalla);
        EventCore.emitAsync('turnero-create', { pantalla });
        return;
    } catch (err) {
        return next(err);
    }
});

router.post('/pantalla/:id/retoken', Auth.authenticate(), async (req: any, res, next) => {
    try {
        let id = req.params.id;
        let organizacion = Auth.getOrganization(req);
        let query = {
            _id: ObjectId(id),
            organizacion: ObjectId(organizacion)
        };
        const pantalla = await TurneroPantallaModel.findOne(query);
        if (pantalla) {
            pantalla.token = generarToken();
            pantalla.expirationTime = moment().add(1, 'hours').toDate();
            await pantalla.save();
            return res.json(pantalla);
        }
        return next(422);

    } catch (err) {
        return next(err);
    }

});

router.patch('/pantalla/:id', Auth.authenticate(), async (req, res, next) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const pantalla = await TurneroPantallaModel.findByIdAndUpdate(id, data, { new: true });

        res.json(pantalla);
        EventCore.emitAsync('turnero-update', { pantalla });
        return;
    } catch (err) {
        return next(err);
    }
});

router.delete('/pantalla/:id', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const pantalla = await TurneroPantallaModel.findById(req.params.id);
        await pantalla.remove();
        res.json({ message: 'OK' });
        EventCore.emitAsync('turnero-remove', { pantalla });

    } catch (err) {
        return next(err);
    }

});

router.post('/pantalla/activate', async (req, res, next) => {
    let codigo = req.body.codigo;
    let pantallas = await TurneroPantallaModel.find({
        token: codigo,
        expirationTime: { $gt: new Date() },
    });
    if (pantallas.length) {
        let pantalla: any = pantallas[0];
        pantalla.token = null;
        pantalla.expirationTime = null;
        await pantalla.save();


        let token = Auth.generateAppToken(pantalla, {}, [`turnero:${pantalla._id}`], 'turnero-token');
        res.send({ token });

        EventCore.emitAsync('turnero-activated', { pantalla });
    } else {
        return next({ message: 'no eiste pantalla' });
    }
});

/**
 * Por el momento cada evento del core lo reenviamos por el websockets
 * Analizar si las cosas de websocket quedan en cada modulo o hay un modulo especial
 */

EventCore.on(/turnero-(.*)/, function (data) {
    const event = this.event;
    Websockets.toRoom(`turnero-${data.pantalla.organizacion}`, event, data);
    switch (event) {
        case 'turnero-update':
            Websockets.toRoom(`turnero-pantalla-${data.pantalla.id}`, event, data);
            break;
    }
});

/**
 * Respondemos a un evento de proximo turno
 */

EventSocket.on('turnero-proximo-llamado', async (paquete: Packet) => {
    try {
        const turno = paquete.data;
        const espacioFisico = ObjectId(turno.espacioFisico._id);
        const pantallas = await TurneroPantallaModel.find({
            'espaciosFisicos._id': espacioFisico
        });
        pantallas.forEach((pantalla) => {
            paquete.toRoom(`turnero-pantalla-${pantalla.id}`, 'mostrar-turno', turno);
        });
    } catch (err) {
        return err;
    }
});

module.exports = router;
