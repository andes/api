import * as express from 'express';
import permisos from '../../../auth/permisos';
import { Auth } from '../../../auth/auth.class';

let router = express.Router();

router.get('/permisos', Auth.authenticate(), function (req, res, next) {
    res.send(permisos);
});

export = router;
