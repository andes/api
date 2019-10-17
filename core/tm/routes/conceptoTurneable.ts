import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import * as mongoose from 'mongoose';
import * as conceptoTurneableController from './../controller/conceptoTurneable';

const router = express.Router();

router.get('/conceptosTurneables', (req, res, next) => {
    conceptoTurneableController.getConceptosTurneables(req.query).then(
        conceptosTurneables => {
            res.json(conceptosTurneables);
        }).catch(error => {
            return next(error);
        });
});

router.post('/conceptosTurneables', (req, res, next) => {
    conceptoTurneableController.postConceptosTurneables(req.body).then(
        conceptosTurneables => {
            res.json(conceptosTurneables);
        }).catch(error => {
            return next(error);
        });
});

router.patch('/conceptosTurneables/:id', (req, res, next) => {
    conceptoTurneableController.patchConceptosTurneables(req.params.id, req.body).then(
        resultado => {
            // Auth.audit(resultado.conceptoTurneable, req);
            // log(req, 'conceptoTurneable:patch', null, 'conceptoTurneable:patch', resultado.conceptoTurneable, resultado.conceptoTurneableOriginal);
            res.json(resultado.conceptoTurneable);
        }).catch(error => {
            return next(error);
        });
});

router.delete('/conceptosTurneables/:id', (req, res, next) => {
    conceptoTurneableController.deleteConceptoTurneable(req.params.id).then(
        conceptoTurneable => {
            res.json(conceptoTurneable);
        }).catch(error => {
            return next(error);
        });
});

export = router;