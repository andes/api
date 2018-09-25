import * as express from 'express';
import * as NumeracionMatriculas from './../schemas/numeracionMatriculas';
import * as SIISA from './../../../core/tm/schemas/siisa';


const router = express.Router();

// router.get('/numeraciones/codigo', (request, response, errorHandler) => {
//     console.log(request.params.codigo)
//     NumeracionMatriculas.find({
//         'profesion.id': request.params.codigo
//     }).exec((error, numeraciones) => {

//         if (error) {
//             return errorHandler(error);
//         }

//         response.json(numeraciones[0]);


//     });
// })

router.get('/numeraciones', (req, res, next) => {
    let resultado;
    if (req.query.especialidad || req.query.profesion) {
        if (req.query.profesion) {
            NumeracionMatriculas.find({ 'profesion._id': req.query.profesion }, (err, data) => {
                if (err) {
                    next(err);
                }
                res.json(data);
            });
        }
        if (req.query.especialidad) {
            NumeracionMatriculas.find({ 'especialidad._id': req.query.especialidad }, (err, data) => {
                if (err) {
                    next(err);
                }
                res.json(data);
            });

        }
    } else {

        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        const chunkSize = parseInt(req.query.size, 10);

        const responseData = {
            totalPages: null,
            data: null
        };

        const busquedaNumeracion = {};
        if (req.query.codigo) {
            busquedaNumeracion['profesion.codigo'] = req.query.codigo;
        }
        if (req.query.codigoEspecialidad) {
            busquedaNumeracion['especialidad.codigo'] = req.query.codigoEspecialidad;
        }

        if (req.query.codigoSisa) {
            busquedaNumeracion['profesion.codigo'] = req.query.codigoSisa;
        }

        if (req.query.codigoSisaEspecialidad) {
            busquedaNumeracion['especialidad.codigo'] = req.query.codigoSisaEspecialidad;
        }

        NumeracionMatriculas.find(busquedaNumeracion)
            .skip(offset)
            .limit(chunkSize)
            .exec((error, data) => {

                if (error) {
                    return next(error);
                }

                responseData.data = data;

                NumeracionMatriculas.count(busquedaNumeracion)
                    .exec((error2, count) => {

                        if (error2) {
                            return next(error2);
                        }

                        responseData.totalPages = Math.ceil(count / chunkSize) !== 0 ? Math.ceil(count / chunkSize) : 1;
                        res.status(201)
                            .json(responseData);
                    });

            });


    }
});

/**
 *
 */


router.get('/numeracionesRestart', (req, resp, errorHandler) => {

    SIISA.Profesion.find({})
        .exec((err, profs) => {
            if (err) {
                return errorHandler(err);
            }
            profs.forEach((prof, i) => {
                const numeracion = new NumeracionMatriculas({
                    profesion: prof,
                    proximoNumero: 1
                });

                numeracion.save((err2, res) => {
                    if (err2) {
                        return errorHandler(err2);
                    }
                    if (i === profs.length - 1) {
                        resp.json('Reset');
                    }
                });

            });
        });
});


/**
 *
 */
router.post('/numeraciones', (request, response, errorHandler) => {
    const opciones = {};
    let query;

    if (request.body.profesion) {
        opciones['profesion._id'] = request.body.profesion._id;
    }

    if (request.body.especialidad) {
        opciones['especialidad._id'] = request.body.especialidad._id;
    }


    query = NumeracionMatriculas.find(opciones);


    query.exec((err, data) => {
        if (data.length > 0) {
            response.send(null);
        } else {
            const newNum = new NumeracionMatriculas(request.body);

            newNum.save((error, numeracion) => {

                if (error) {
                    return errorHandler(error);
                }

                response.status(201)
                    .json(numeracion);
            });
        }
    });


});


router.put('/numeraciones', (request, response, errorHandler) => {
    NumeracionMatriculas.findByIdAndUpdate(request.body.id, request.body, (error, numeracion) => {

        if (error) {
            return errorHandler(error);
        }

        response.json(numeracion);
    });

});


export = router;
