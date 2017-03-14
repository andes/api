import * as express from 'express';
import { problema } from '../schemas/problema';
let router = express.Router();

router.get('/problemas/:idProblema*?', function (req, res, next) {

    let query;

    if (req.params.idProblema) {
        query = problema.findById(req.params.idProblema);

    } else {
        query = problema.find({
            $where: "this.evoluciones[this.evoluciones.length - 1].vigencia != 'transformado'"
        });
        if (req.query.idPaciente) {
            query.where('paciente').equals(req.query.idPaciente);
        }
    }

    query.populate('idProblemaOrigen');
    query.populate('tipoProblema').sort({ 'fechaInicio': -1 });

    query.exec(function (err, data) {
        if (err) {
            next(err);
        };
        res.json(data);
    });


});

router.post('/problemas/', function (req, res, next) {
    console.log(req.body);

    let newProblema = new problema(req.body)
    newProblema.save((err) => {
        if (err) {
            return next(err);
        }

        problema.findById(newProblema._id.toString()).populate('tipoProblema').exec(function (err, data) {
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
        console.log('Ingreso a put problemas', req.body);
        let listaProblemas = req.body;
        let listaResultado = [];
        listaProblemas.forEach(element => {
            problema.findByIdAndUpdate(element.id, element, { new: true }, function (err, data) {
                if (err) {
                    return next(err);
                }
                listaResultado.push(data);
                console.log('listaResultado.length', listaResultado.length);
                if (listaProblemas.length === listaResultado.length) {
                    console.log('listaResultado.length Final', listaResultado.length);
                    res.json(listaResultado);
                }
            });

        });

    }
});

router.delete('/problemas/:id', function (req, res, next) {
    problema.findByIdAndRemove(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

export = router;
