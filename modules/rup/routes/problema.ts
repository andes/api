import * as express from 'express'
import * as problema from '../schemas/problema'
var router = express.Router();

router.get('/pacientes/:idPaciente/problemas/:idProblema*?', function (req, res, next) {

    var query;

    if (req.params.idProblema) {
        query = problema.findById(req.params.id);

    } else {

        query = problema.find({}); //Trae todos 
        query.where('paciente').equals(req.params.idPaciente);
    }

    query.populate('tipoProblema').exec(function (err, data) {
        if (err) {
            next(err);
        };
        res.json(data);
    });


});

router.post('/problemas/', function (req, res, next) {
    var problema = new problema(req.body)
    problema.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(problema);
    })
});

router.put('/problemas/:id', function (req, res, next) {
    console.log(req.body);

    if (req.params.id) {
        problema.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        var listaProblemas = req.body.problemas;
        var listaResultado = [];
        listaProblemas.forEach(element => {
            problema.findByIdAndUpdate(element.id, element, { new: true }, function (err, data) {
                if (err) {
                    return next(err);
                }
                listaResultado.push(data);
            });

            if (listaProblemas.length <= listaResultado.length) {
                res.json(listaResultado);
            }
        });

    }
});

router.delete('/problemas/:id', function (req, res, next) {
    problema.findByIdAndRemove(req.params.id, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;