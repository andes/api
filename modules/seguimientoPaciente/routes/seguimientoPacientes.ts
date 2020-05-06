import * as express from 'express';
import {seguimientoPacientes} from '../schemas/seguimientoPacientes';
// import { Auth } from '../../../auth/auth.class';
import * as mongoose from 'mongoose';
import * as seguimientoPacientesController from '../controllers/seguimientoPacientes.controller';



const router = express.Router();

router.get('/registros', (req, res, next) => {
    console.log("llegue");
    if (!req.params.dni && !req.params.sexo) {
        return next('Debe ingresar un parámetro de búsqueda');
    }
    seguimientoPacientesController.buscarRegistros(req.params.dni, req.params.sexo)
        .then(registros => {
            res.json(registros);
        }).catch(error => {
            return next(error);
        });
});

module.exports = router;
