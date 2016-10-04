import * as express from 'express'
import * as barrio from '../schemas/barrio'

var router = express.Router();

router.get('/barrio/:id*?', function(req, res, next) {

   if (req.params.id) {
       barrio.findById(req.params.id, function (err, data) {
       if (err) {
           next(err);
       };

       res.json(data);
   });
   }
   else{
       var query;
        query = barrio.find({});
        if (req.query.nombre){
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        if (req.query.localidad){
            query.where('localidad.id').equals(req.query.localidad);
        }
        query.exec((err, data)=> {
           if (err) return next(err);
           res.json(data);
        });
   }
});

export = router;