import * as express from 'express';
import * as agenda from '../schemas/agendaMatriculaciones';
import { Auth } from '../../../auth/auth.class';
const router = express.Router();

router.get('/agendaMatriculaciones/', (req, res, next) => {

    agenda.find((err, data) => {
        if (err) {
            next(err);
        }

        res.status(201).json(data);
    });

});

router.post('/agendaMatriculaciones', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'matriculaciones:agenda:postAgenda')) {
        return next(403);
    }

    agenda.find({}, {}, {
        sort: {
            _id: -1
        }
    }, (err, resultado) => {
        if (resultado[0] !== undefined) {
            agenda.findByIdAndUpdate(resultado[0]._id, req.body, { new: true }, (errUpdate, data) => {
                if (errUpdate) {
                    return next(errUpdate);
                }
                res.status(201).json(data);
            });
        } else {
            const newAgenda = new agenda(req.body);
            newAgenda.save((errSave) => {
                if (errSave) {
                    return next(errSave);
                }
                res.status(201).json(newAgenda);
            });
        }

    });
});


router.put('/agendaMatriculaciones/:_id', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'matriculaciones:agenda:putAgenda')) {
        return next(403);
    }
    agenda.findByIdAndUpdate(req.params._id, req.body, { new: true }, (err, data) => {
        if (err) {
            return next(err);
        }
        res.status(201).json(data);
    });
});

export = router;
