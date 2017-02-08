import * as express from 'express'
import { paciente } from '../../schemas/paciente'
import { servicioSisa } from '../../../../utils/servicioSisa'

var router = express.Router();

router.get('/matching/:id*?', function (req, res, next) {
    if (req.params.id) {
        paciente.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data); 
        });
    } else {
        var query;
        query = paciente.find({ matchSisa: { $gt: 0.7,  $lte: 0.99 }, estado:'temporal' });
        query.exec((err, data) => {
            if (err) return next(err);
            res.json(data);
        });
    }
});

/*CORREGIR ESTO VER LO DE AGENDAS HACER UN PATCH POR OPERACION */
router.get('/matching/:id', function (req, res, next) {
    
    console.log('entreeee');
    var filtro = req.params.id;
    var query = {};
    query[filtro] = {
        $eq: req.params.id
    };

    paciente.find(query, function (err, data) {
        if (err) {
            next(err);
        };
        var servSisa = new servicioSisa();
        
        var weights = {
            identity: 0.3,
            name: 0.3,
            gender: 0.1,
            birthDate: 0.3
        };
        var pacienteOriginal;
        var pacienteAux;
        pacienteOriginal = data;
        pacienteAux = data;
        var pacientesRes = [];
        
        pacientesRes.push(servSisa.matchSisa(pacienteAux));
        
        Promise.all(pacientesRes).then(values => {

            var arrPacValidados;
            arrPacValidados = values;
            var arrSalida = [];
            arrPacValidados.forEach(function (pacVal) {
                var datoPac;
                datoPac = pacVal;
                if (datoPac.matcheos.matcheo >= 99 && datoPac.paciente.estado == 'temporal') {
                    arrSalida.push(servSisa.validarPaciente(datoPac, "Sisa"))
                } else {
                    arrSalida.push(datoPac);
                }
            });

            Promise.all(arrSalida).then(PacSal => {
                res.json(PacSal);
            }).catch(err => {
                console.log(err);
                next(err);
            })

        }).catch(err => {
            console.log(err);
            next(err);
        })

    })
});

// router.post('/matching', function (req, res, next) {
//     var newMatching = new paciente(req.body)
//     newMatching.save((err) => {
//         if (err) {
//             return next(err);
//         }
//         res.json(newMatching);
//     })
// });

// router.put('/matching/:id', function (req, res, next) {
//     matching.findByIdAndUpdate(req.params.id, req.body, {new:true}, function (err, data) {
//         if (err) {
//             return next(err);
//         }
//         res.json(data);
//     });
// });

// router.delete('/matching/:_id', function (req, res, next) {
//     matching.findByIdAndRemove(req.params._id, function (err, data) {
//         if (err)
//             return next(err);

//         res.json(data);
//     });
// })

export = router;