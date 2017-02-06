import * as express from 'express'
// import * as prestacionPaciente from '../schemas/prestacionPaciente'
import { prestacionPaciente } from '../schemas/prestacionPaciente'

var router = express.Router();
router.get('/prestaciones/', function (req, res, next) {
    var query;
    if (req.params.id) {
        query = prestacionPaciente.findById(req.params.id);
    } else {
        query = prestacionPaciente.find({}); //Trae todos 
        // if (req.query.nombre) {
        //     query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        // }

        if (req.query.idTipoPrestacion) {
            query.where('solicitud.tipoPrestacion._id').equals(req.query.idTipoPrestacion);
        }
        if (req.query.idPaciente) {
            query.where('paciente._id').equals(req.query.paciente.id);
        }
        console.log("req.query", req.query);
        if (req.query.estado) {
            query.where("estado[estado.length - 1].tipo").equals(req.query.estado);
        }
    }

    query.exec(function (err, data) {
        if (err) {
            next(err);
        };
        //console.log(query);
        res.json(data);
    });

});
// router.post('/prestaciones', function (req, res, next) {
//     var prestacion = new prestacionPaciente(req.body)
//     prestacion.save((err) => {
//         if (err) {
//             return next(err);
//         }
//         res.json(prestacion);
//     })
// });
// router.put('/prestaciones/:id', function (req, res, next) {
//     prestacionPaciente.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
//         if (err) {
//             return next(err);
//         }
//         res.json(data);
//     });
// });
// router.delete('/prestaciones/:id', function (req, res, next) {
//     prestacionPaciente.findByIdAndRemove(req.params.id, function (err, data) {
//         if (err)
//             return next(err);
//         res.json(data);
//     });
// })
export = router;