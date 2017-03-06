import * as express from 'express'
import * as problema from '../schemas/problema'
var router = express.Router();

router.get('/problemas/:idProblema*?', function (req, res, next) {

    var query;

    if (req.params.idProblema) {
        query = problema.findById(req.params.idProblema);

    } else {

        query = problema.find({}); //Trae todos 
        query.where('paciente').equals(req.params.idPaciente);
    }

    query.populate('tipoProblema').sort({ "fechaInicio": -1 });

    query.exec(function (err, data) {
        if (err) {
            next(err);
        };
        res.json(data);
    });


});

router.post('/problemas/', function (req, res, next) {
    console.log(req.body);
    var newProblema = new problema(req.body)

    newProblema.save((err) => {
        if (err) {
            return next(err);
        }

        problema.findById(newProblema.id.toString()).populate('tipoProblema').exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    })
});

router.put('/problemas/:id?', function (req, res, next) {
    if (req.params.id) {
        problema.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        console.log("Ingreso a put problemas", req.body);
        var listaProblemas = req.body;
        var listaResultado = [];
        listaProblemas.forEach(element => {
            problema.findByIdAndUpdate(element.id, element, { new: true }, function (err, data) {
                if (err) {
                    return next(err);
                }
                listaResultado.push(data);
                console.log("listaResultado.length", listaResultado.length);
                if (listaProblemas.length == listaResultado.length) {
                    console.log("listaResultado.length Final", listaResultado.length);
                    res.json(listaResultado);
                }
            });

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