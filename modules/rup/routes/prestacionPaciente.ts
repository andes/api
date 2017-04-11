import * as express from 'express';
import { Auth } from './../../../auth/auth.class';
import { prestacionPaciente } from '../schemas/prestacionPaciente';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';

let router = express.Router();

router.get('/prestaciones/forKey', function(req, res, next) {

    let filtro = 'ejecucion.evoluciones.valores';
    let key = req.query.key;
    let listakey = [];
    let query = { 'paciente._id': req.query.idPaciente };
    query[filtro] = {
        $exists: true
    };
    let consulta = prestacionPaciente.find(query).sort({ 'ejecucion.fecha': -1 });
    consulta.exec(function(err, data) {
        if (err) {
            next(err);
        } else {
            // Se recorren las prestaciones del paciente para obtener las prestaciones que incluyan la key recibida
            let prestaciones = data;
            let lista = [];
              let listaValores = [];
            if (prestaciones.length > 0) {
                prestaciones.forEach(prestacion => {
                    //if (lista.length <= 0) {
                    prestacion.ejecucion.evoluciones.forEach(evolucion => {
                        let valor = evolucion.valores;
                        lista = findValues(valor, key);
                        if (lista.length > 0) {
                            listaValores = listaValores.concat(lista);
                        }
                    });

                    if (listaValores.length > 0) {
                        listakey.push({ 'valor': listaValores[listaValores.length-1], 'fecha:': prestacion.ejecucion.fecha });
                        listaValores = [];
                    }
                    //}

                });
            }
            res.json(listakey);
        }
    });

});

function findValues(obj, key) {  //funcion para buscar una key y recuperar la prestacion que la contiene
    return findValuesHelper(obj, key, []);
}

function findValuesHelper(obj, key, list) {
    let i;
    let children;
    if (!obj) return list;
    if (obj instanceof Array) {
        for (i in obj) {
            list = list.concat(findValuesHelper(obj[i], key, []));
        }
        return list;
    }
    if (obj[key]) { list.push(obj[key]); return list }

    if ((typeof obj == "object") && (obj !== null)) {
        children = Object.keys(obj);
        if (children.length > 0) {
            for (i = 0; i < children.length; i++) {
                list = list.concat(findValuesHelper(obj[children[i]], key, []));
            }
        }
    }
    return list;
}

router.get('/prestaciones/:id*?', function(req, res, next) {
    let query;
    if (req.params.id) {
        query = prestacionPaciente.findById(req.params.id);
    } else {
        if (req.query.estado) {
            query = prestacionPaciente.find({
                $where: "this.estado[this.estado.length - 1].tipo == '" + req.query.estado + "'"
            })
        } else {
            query = prestacionPaciente.find({}); //Trae todos
        }

        if (req.query.idTipoPrestacion) {
            query.where('solicitud.tipoPrestacion._id').equals(req.query.idTipoPrestacion);
        }
        if (req.query.idPaciente) {
            query.where('paciente._id').equals(req.query.idPaciente);
        }
        if (req.query.idPrestacionOrigen) {
            query.where('idPrestacionOrigen').equals(req.query.idPrestacionOrigen);
        }

        if (req.query.turnos) {
            //let idsTurnos = req.query.turnos.split(",");
            query.where('solicitud.idTurno').in(req.query.turnos);
        }
    }

    // populamos todo lo necesario de la solicitud luego del find
    query.populate({
        path: 'solicitud.listaProblemas',
        model: 'problema',
        populate: {
            path: 'tipoProblema',
            model: 'tipoProblema'
        }
    });

    query.populate({
        path: 'solicitud.tipoPrestacion.ejecucion',
        model: 'tipoPrestacion'
    });

    query.populate({
        path: 'solicitud.tipoPrestacion.ejecucion.prestaciones',
        model: 'prestacionPaciente',
        populate: {
            path: 'solicitud.listaProblemas',
            model: 'problema',
            populate: {
                path: 'tipoProblema',
                model: 'tipoProblema'
            }
        }
    });

    //populuamos todo lo necesario de la ejecucion
    query.populate({
        path: 'ejecucion.prestaciones',
        model: 'prestacionPaciente',
        populate: [{
            path: 'solicitud.listaProblemas',
            model: 'problema',
            populate: {
                path: 'tipoProblema',
                model: 'tipoProblema'
            },
        },
            {
                path: 'ejecucion.listaProblemas',
                model: 'problema',
                populate: {
                    path: 'tipoProblema',
                    model: 'tipoProblema'
                },
            }]
    });

    query.populate({
        path: 'ejecucion.listaProblemas',
        model: 'problema',
        populate: {
            path: 'tipoProblema',
            model: 'tipoProblema'
        }
    });

    //populuamos las prestaciones a futuro
    query.populate({
        path: 'prestacionesSolicitadas',
        model: 'prestacionPaciente',
        populate: {
            path: 'solicitud.listaProblemas',
            model: 'problema',
            populate: {
                path: 'tipoProblema',
                model: 'tipoProblema'
            }
        }
    });

    query.sort({ "solicitud.fecha": -1 });

    if (req.query.limit) {
        query.limit(parseInt(req.query.limit));
    }


    query.exec(function(err, data) {
        if (err) {
            next(err);
        };
        //console.log(query);
        res.json(data);
    });
});



router.post('/prestaciones', function(req, res, next) {
    var prestacion;
    prestacion = new prestacionPaciente(req.body);

    Auth.audit(prestacion, req);
    prestacion.save((err) => {
        if (err) {
            return next(err);
        }

        res.json(prestacion);
    });
});

router.put('/prestaciones/:id', function(req, res, next) {
    // Auth.audit(prestacion, req);
    prestacionPaciente.findByIdAndUpdate(req.params.id, req.body, {
        new: true
    }, function(err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/prestaciones/:id', function(req, res, next) {
    prestacionPaciente.findByIdAndRemove(req.params.id, function(err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
})

export = router;
