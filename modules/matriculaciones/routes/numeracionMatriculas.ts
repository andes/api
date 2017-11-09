import * as express from 'express';
import * as NumeracionMatriculas from './../schemas/numeracionMatriculas';
import * as SIISA from './../../../core/tm/schemas/siisa';;


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

    NumeracionMatriculas.find({'profesion._id': req.params.id}, function (err, data) {
            if (err) {
                next(err);
            };
            res.json(data);
        });
    });

/**
 * 
 */
router.get('/numeraciones/?', function(request, response, errorHandler) {

    let offset = request.query.offset ? parseInt(request.query.offset) : 0;
    let chunkSize = parseInt(request.query.size);

    let responseData = {
        totalPages: null,
        data: null
    };

    var busquedaNumeracion = {};
    console.log(request.query.codigo);
    if (request.query.codigo) {
        busquedaNumeracion['profesion._id'] = request.query.codigo;
    }

    NumeracionMatriculas.find(busquedaNumeracion)
        .skip(offset)
        .limit(chunkSize)
        .exec(function(error, data) {

            if (error) {
                return errorHandler(error);
            }

            responseData.data = data;

            NumeracionMatriculas.count(busquedaNumeracion)
                .exec((error, count) => {

                    if (error) {
                        return errorHandler(error);
                    }

                    responseData.totalPages = Math.ceil(count / chunkSize) != 0 ? Math.ceil(count / chunkSize) : 1;
                    response.status(201)
                        .json(responseData);
            });

    });

});

router.get('/numeracionesRestart', (req, resp, errorHandler) => {

    SIISA.Profesion.find({})
        .exec((err, profs) => {
            if (err) {
                return errorHandler(err);
            }

 /*           console.log(profs)
            resp.json(profs)*/

            profs.forEach((prof, i) => {
                var numeracion = new NumeracionMatriculas({
                    profesion: prof,
                    proximoNumero: 1
                });

                numeracion.save((err, res) => {

                    if (i === profs.length -1) {
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
    
    console.log(request.body)
    if (request.body._id) {
        console.log("update numeracion")
        NumeracionMatriculas.findByIdAndUpdate(request.body.id, request.body, (error, numeracion) => {
            
            if (error) {
                return errorHandler(error);
            }

            response.json(numeracion);    
        });






        

    } else {
        console.log("insert")
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