import * as express from 'express'
import * as localidad from '../schemas/localidad'

var router = express.Router();

router.get('/localidad/:id*?', function(req, res, next) {

   if (req.params.id) {
       localidad.findById(req.params.id, function (err, data) {
       if (err) {
           next(err);
       };

       res.json(data);
   });
   }
   else{
       var query;
        query = localidad.find({});
        if (req.query.nombre){
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        if (req.query.provincia){
            query.where('provincia.id').equals(req.query.provincia);
        }
        query.exec((err, data)=> {
           if (err) return next(err);
           res.json(data);
        });
   }
});

export = router;