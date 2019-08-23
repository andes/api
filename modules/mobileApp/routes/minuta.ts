import * as express from 'express';
import { Minuta } from '../schemas/minuta';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.post('/minuta', async (req, res, next) => {
    try {
        const newMinuta = new Minuta(req.body);
        Auth.audit(newMinuta, req);
        let respuesta = await newMinuta.save();
        res.json(respuesta);
    } catch (error) {
        return next(error);
    }
});

router.get('/minuta', async (req: any, res, next) => {
    try {
        let data = await Minuta.find({});
        res.json(data);
    } catch (error) {
        return next(error);
    }
});

router.patch('/minuta/:id', (req, res, next) => {
    Minuta.findById({
        _id: req.params.id,
    }, (err, data: any) => {
        if (err) {
            return next(err);
        }
        if (req.body.quienRegistra) {
            data.quienRegistra = req.body.quienRegistra;
        }
        if (req.body.fecha) {
            data.fecha = req.body.fecha;
        }
        if (req.body.participantes) {
            data.participantes = req.body.participantes;
        }
        if (req.body.temas) {
            data.temas = req.body.temas;
        }
        if (req.body.conclusiones) {
            data.conclusiones = req.body.conclusiones;
        }
        if (req.body.pendientes) {
            data.pendientes = req.body.pendientes;
        }
        if (req.body.lugarProxima) {
            data.lugarProxima = req.body.lugarProxima;
        }
        if (req.body.fechaProxima) {
            data.fechaProxima = req.body.fechaProxima;
        }
        if (req.body.estado) {
            data.estado = req.body.estado;
        }
        if (req.body.origen) {
            data.origen = req.body.origen;
        }

        Auth.audit(data, req);
        data.save((errUpdate) => {
            if (errUpdate) {
                return next(errUpdate);
            }
            res.json(data);
        });
    });
});

export = router;
