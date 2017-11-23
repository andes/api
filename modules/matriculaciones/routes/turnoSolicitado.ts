import { defaultLimit, maxLimit } from './../../../config';
import * as mongoose from 'mongoose';
import * as express from 'express';
import * as utils from '../../../utils/utils';
import * as config from '../../../config';
import { Auth } from './../../../auth/auth.class';
import * as fs from 'fs';
import { turnoSolicitado } from '../schemas/turnoSolicitado';

// import{ profesional } from '../../../core/tm/schemas/profesional'


let router = express.Router();

router.post('/turnoSolicitados', function (req, res, next) {

    // // // if (!Auth.check(req, 'matriculaciones:profesional:postProfesional')) {
    // // //     return next(403);
    // // // }
                if (req.body.id) {
                    turnoSolicitado.findByIdAndUpdate(req.body.id, req.body, { new: true }, function (err, data) {
                         if (err) {
                            return next(err);
                        }
                        res.json(data);
                     });
                } else {
                    turnoSolicitado.findOne({ 'documentoNumero': req.body.documentoNumero }, function (err, person) {
                        if (person !== null) {
                            res.json(null);
                        } else {
                            let newProfesional = new turnoSolicitado(req.body);
                            newProfesional.save((err) => {

                                if (err) {
                                    next(err);
                                }
                                res.json(newProfesional);
                            });

                        }

                     });

                }



});

router.get('/turnoSolicitados/traePDni/:dni*?', (req: any, res, next) => {
    let dni = req.params.dni;
    console.log(dni)
    turnoSolicitado.find({ 'documentoNumero' : dni}, function (err, data) {
        console.log(data)
        res.json(data[0]);
    
    });

});

export = router;
