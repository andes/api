import * as express from 'express';
// import { Auth } from './../../../auth/auth.class';
let router = express.Router();
// Services
import { Logger } from '../../../utils/logService';
// Schemas
import {usuario} from '../schemas/usuario';
// import { log } from '../../log/schemas/log';

// Simple mongodb query by ObjectId --> better performance
router.get('/usuarios/:id', function (req, res, next) {
    // if (!Auth.check(req, 'mpi:get:byId')) {
    //     return next(403);
    // }
    usuario.findById(req.params.id).then((resultado: any) => {
        if (resultado) {
            // Logger.log(req, 'mpi', 'query', {
            //     mongoDB: resultado.paciente
            // });
            res.json(resultado);
        }
    }).catch((err) => {
        return next(err);
    });
});
router.get('/usuarios', function (req, res, next) {
    // if (!Auth.check(req, 'mpi:get:byId')) {
    //     return next(403);
    // }
    usuario.find({}).then((resultado: any) => {
        if (resultado) {
            // Logger.log(req, 'mpi', 'query', {
            //     mongoDB: resultado.paciente
            // });
            res.json(resultado);
        }
    }).catch((err) => {
        return next(err);
    });
});

export = router;
