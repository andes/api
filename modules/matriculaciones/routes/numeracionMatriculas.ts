import * as express from 'express';
import * as NumeracionMatriculas from './../schemas/numeracionMatriculas';
import * as SIISA from './../../../core/tm/schemas/siisa';


var router = express.Router();

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

router.get('/numeraciones/:id*?', function (req, res, next) {

if ( req.params.id) {
    NumeracionMatriculas.find({'profesion._id': req.params.id}, function (err, data) {
            if (err) {
                next(err);
            }
            res.json(data);
        });

    } else {

        let offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        let chunkSize = parseInt(req.query.size, 10);

        let responseData = {
            totalPages: null,
            data: null
        };

        var busquedaNumeracion = {};
        if (req.query.codigo) {
            busquedaNumeracion['profesion._id'] = req.query.codigo;
        }

        NumeracionMatriculas.find(busquedaNumeracion)
            .skip(offset)
            .limit(chunkSize)
            .exec(function(error, data) {

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
                var numeracion = new NumeracionMatriculas({
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
router.post('/numeraciones', function(request, response, errorHandler) {
    if (request.body.id) {
        NumeracionMatriculas.findByIdAndUpdate(request.body.id, request.body, (error, numeracion) => {

            if (error) {
                return errorHandler(error);
            }

            response.json(numeracion);
        });
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



export = router;
