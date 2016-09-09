import * as express from 'express'
import * as establecimiento from '../schemas/establecimiento'

var router = express.Router();

router.get('/establecimiento/:id*?', function(req, res, next) {
    if (req.params.id) {
        
        establecimiento.findById(req.params.id, function (err, data) {
        if (err) {
            next(err);
        };

        res.json(data);
    });
    }
    else{
        var query;
        //if (!(req.query.codigoSisa || req.query.nombre))
               // return next();

         query = establecimiento.find({habilitado:true}); //Trae todos 

            if (req.query.codigoSisa)
                query.where('codigo.sisa').equals(req.query.codigoSisa);
            if (req.query.nombre){
                query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
           }
            query.exec((err, data)=> {
                if (err) return next(err);
                res.json(data);
            });
    }
});

router.post('/establecimiento', function (req, res, next) {
    var newEstablecimiento = new establecimiento(req.body);
    newEstablecimiento.save((err) => {
        if (err) {
            next(err);
        }

        res.json(newEstablecimiento);
    });
});

router.put('/establecimiento/:_id', function (req, res, next) {
    establecimiento.findByIdAndUpdate(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
});

router.delete('/establecimiento/:_id', function (req, res, next) {
    establecimiento.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;







