import * as express from 'express';
import { HojaTrabajo } from './../schemas/hojaTrabajo';
import { Auth } from '../../../../auth/auth.class';


let router = express.Router();

router.get('/hojatrabajo', async (req, res, next) => {
    HojaTrabajo.find({ laboratorio: req.query.organizacion }).then((hojas: any[]) => {
        res.json(hojas);
    });
});

router.get('/hojatrabajo/:id', async (req, res, next) => {
    let query;
    if (req.params.id) {
        query = HojaTrabajo.findById(req.params.id);
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            if (!data) {
                return next(404);
            }
            res.json(data);
        });
    }
});

router.post('/hojatrabajo', async (req, res, next) => {
    const hojatrabajo = req.body;

    const data = new HojaTrabajo(hojatrabajo);

    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.put('/hojatrabajo/:id', async (req, res, next) => {
    HojaTrabajo.findByIdAndUpdate(req.params.id, req.body, (err, data: any) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


router.patch('/hojatrabajo/:id', (req, res, next) => {
    HojaTrabajo.findById(req.params.id, (err, data: any) => {
        if (err) {
            return next(err);
        }
        if (data) {
            data.nombre = req.body.nombre ? req.body.nombre : data.nombre;
            data.area = req.body.area ? req.body.area : data.area;
            data.protocolo = req.body.protocolo ? req.body.protocolo : data.protocolo;
            if (req.body.paciente) {
                data.paciente = req.body.paciente;
            }
            if (req.body.papel) {
                data.papel = req.body.papel;
            }
            if (req.body.practicas) {
                data.practicas = req.body.practicas;
            }

            Auth.audit(data, req);
            data.save((error, hoja) => {
                if (error) {
                    return next(error);
                }
                res.json(hoja);
            });
        }
    });
});

export = router;
