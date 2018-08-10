import * as express from 'express';
import * as agenda from '../schemas/agendaMatriculaciones';
import * as utils from '../../../utils/utils';
import { Auth } from '../../../auth/auth.class';
let router = express.Router();

router.get('/agendaMatriculaciones/', function (req, res, next) {

    agenda.find(function (err, data) {
        if (err) {
            next(err);
        }

        res.status(201).json(data);
    });

});

router.post('/agendaMatriculaciones', Auth.authenticate(), function (req, res, next) {
    if (!Auth.check(req, 'matriculaciones:agenda:postAgenda')) {
        return next(403);
    }

    agenda.find({}, {}, {
        sort: {
            _id: -1
        }
    }, function (err, resultado) {
        if (resultado[0] !== undefined) {
            agenda.findByIdAndUpdate(resultado[0]._id, req.body, { new: true }, function (errUpdate, data) {
                if (errUpdate) {
                    return next(errUpdate);
                }
                res.status(201).json(data);
            });
        } else {
            let newAgenda = new agenda(req.body);
            newAgenda.save((errSave) => {
                if (errSave) {
                    return next(errSave);
                }
                res.status(201).json(newAgenda);
            });
        }

    });
});


router.put('/agendaMatriculaciones/:_id', Auth.authenticate(), function (req, res, next) {
    if (!Auth.check(req, 'matriculaciones:agenda:putAgenda')) {
        return next(403);
    }
    agenda.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.status(201).json(data);
    });
});

export = router;
