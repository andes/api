import * as express from 'express';
import { problema } from '../schemas/problema';
let router = express.Router();

router.get('/problemas/:idProblema', function (req, res, next) {

    let query;

    if (req.params.idProblema) {
        query = problema.findById(req.params.idProblema);

    } else {

        // if (req.query.vigencia) {
        //     query = problema.find({
        //         $where: "this.evoluciones[this.evoluciones.length - 1].vigencia != '" + req.query.vigencia + "'"
        //     });
        // } else {
        //     // filtro por defecto para que no muestre los problemas transformados
        //     query = problema.find({
        //         $where: "this.evoluciones[this.evoluciones.length - 1].vigencia != 'transformado'"
        //     });
        // }

        // if (req.query.idPaciente) {
        //     query.where('paciente').equals(req.query.idPaciente);
        // }

        // if (req.query.idTipoProblema) {
        //     query.where('tipoProblema').equals(req.query.idTipoProblema);
        // }
    }


    query.populate({
        path: 'evoluciones.profesional',
        model: 'profesional'
    });
    // query.populate('idProblemaOrigen');
    query.populate({
        path: 'idProblemaOrigen',
        model: 'problema',
        // populate: {
        //     path: 'tipoProblema',
        //     model: 'tipoProblema'
        // }
    });

    // query.populate('tipoProblema').sort({ 'fechaInicio': -1 });
    query.sort({ 'fechaInicio': -1 });

    query.exec(function (err, data) {
        if (err) {
            next(err);
        };
        res.json(data);
    });


});

router.get('/problemas', function (req, res, next) {
    console.log(req.query);
    let query = problema.find();

    // if (req.query.vigencia) {
    //     query = problema.find({
    //         $where: "this.evoluciones[this.evoluciones.length - 1].vigencia != '" + req.query.vigencia + "'"
    //     });
    // } else {
    //     // filtro por defecto para que no muestre los problemas transformados
    //     query = problema.find({
    //         $where: "this.evoluciones[this.evoluciones.length - 1].vigencia != 'transformado'"
    //     });
    // }

    if (req.query.idPaciente) {
        query.where('paciente').equals(req.query.idPaciente);
    }

    if (req.query.idTipoProblema) {
        query.where('tipoProblema').equals(req.query.idTipoProblema);
    }



    query.populate({
        path: 'evoluciones.profesional',
        model: 'profesional'
    });
    // // query.populate('idProblemaOrigen');
    // query.populate({
    //     path: 'idProblemaOrigen',
    //     model: 'problema',
    //     populate: {
    //         path: 'tipoProblema',
    //         model: 'tipoProblema'
    //     }
    // });
    // query.populate('tipoProblema').sort({ 'fechaInicio': -1 });
    query.sort({ 'fechaInicio': -1 });

    query.exec(function (err, data) {
        if (err) {
            next(err);
        };
        res.json(data);
    });


});

router.post('/problemas/', function (req, res, next) {
    // console.log(req.body);

    let newProblema = new problema(req.body)
    newProblema.save((err) => {
        if (err) {
            return next(err);
        }

        // TODO: Ya no se necesita el populate
        // problema.findById(newProblema._id.toString()).populate('tipoProblema').exec(function (err, data) {
        //     if (err) {
        //         return next(err);
        //     }
        //     res.json(data);
        // });
        res.json(newProblema);
    });
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
        // console.log('Ingreso a put problemas', req.body);
        let listaProblemas = req.body;
        let listaResultado = [];
        listaProblemas.forEach(element => {
            problema.findByIdAndUpdate(element.id, element, { new: true }, function (err, data) {
                if (err) {
                    return next(err);
                }
                listaResultado.push(data);
                // console.log('listaResultado.length', listaResultado.length);
                if (listaProblemas.length === listaResultado.length) {
                    // console.log('listaResultado.length Final', listaResultado.length);
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
