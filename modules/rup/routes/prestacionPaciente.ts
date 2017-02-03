import * as express from 'express'
// import * as prestacionPaciente from '../schemas/prestacionPaciente'
import { prestacionPaciente } from '../schemas/prestacionPaciente'

var router = express.Router();
router.get('/prestaciones/', function (req, res, next) {
    // var query;
    // if (req.params.id) {
    //     query = prestacionPaciente.findById(req.params.id);
    // } else {
    //     query = prestacionPaciente.find({}); //Trae todos 
    //     // if (req.query.nombre) {
    //     //     query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
    //     // }
    //     if (req.query.paciente.id) {
    //         query.where('paciente._id').equals(req.query.paciente.id);
    //     }
    //     if (req.query.estado) {
    //         query.where('estado').equals(req.query.estado);
    //     }

    // }
    var query = prestacionPaciente.find({});
    query.exec(function (err, data) {
        if (err) {
            next(err);
        };
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