import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
// import * as async from 'async';
import { Auth } from './../../../auth/auth.class';
import { model as Prestacion } from '../schemas/prestacion';
import { model as cama } from '../../../core/tm/schemas/camas';

let router = express.Router();

router.get('/internaciones/:idPaciente', function (req, res, next) {

    let query;
    if (req.query.estado) {
        query = Prestacion.find({
            $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + req.query.estado + '\"'
        });
    } else {
        query = Prestacion.find({}); // Trae todos
    }

    if (req.query.fechaDesde) {
        query.where('ejecucion.fecha').gte(moment(req.query.fechaDesde).startOf('day').toDate() as any);
    }
    if (req.query.fechaHasta) {
        query.where('ejecucion.fecha').lte(moment(req.query.fechaHasta).endOf('day').toDate() as any);
    }
    if (req.query.idProfesional) {
        query.where('solicitud.profesional.id').equals(req.query.idProfesional);
    }
    if (req.query.idPaciente) {
        query.where('paciente.id').equals(req.query.idPaciente);
    }
    if (req.query.organizacion) {
        query.where('solicitud.organizacion.id').equals(req.query.organizacion);
    }
    // Ordenar por fecha de solicitud
    if (req.query.ordenFecha) {
        query.sort({ 'solicitud.fecha': -1 });
    } else if (req.query.ordenFechaEjecucion) {
        query.sort({ 'ejecucion.fecha': -1 });
    }

    if (req.query.limit) {
        query.limit(parseInt(req.query.limit, 10));
    }
    query.then(internaciones => {
        console.log(internaciones);
        res.json(internaciones);
    });
});

export = router;
