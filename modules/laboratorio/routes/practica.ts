import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
// import * as async from 'async';
import { Practica } from '../schemas/practica';
import { Auth } from './../../../auth/auth.class';
import { buscarPaciente } from '../../../core/mpi/controller/paciente';
import { NotificationService } from '../../mobileApp/controller/NotificationService';

import { Logger } from '../../../utils/logService';
import { ObjectId } from 'bson';

let router = express.Router();
let async = require('async');

router.get('/practicas', function (req, res, next) {

    console.log('practicas')
    if (req.params.id) {
        let query = Practica.findById(req.params.id);
        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            if (!data) {
                return next(404);
            }
            res.json(data);
        });
    } else {
        let paramBusqueda = req.query.cadenaInput;
        paramBusqueda = paramBusqueda.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
        
        let query = {
            '$or': [
                {codigo: { '$regex': paramBusqueda }}, 
                {descripcion: { '$regex': paramBusqueda }}, 
                {nombre: { '$regex': paramBusqueda }}, 
                {'concepto.term': { '$regex': paramBusqueda }} 
            ]
        };
        
        Practica.find(query).then((practicas: any[]) => {
            res.json(practicas);
        });
    }
});


export = router;
