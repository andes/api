import * as express from 'express'
import * as pais from '../schemas/pais'

var router = express.Router();

router.get('/pais/:id*?', function(req, res, next) {

   if (req.params.id) {
       pais.findById(req.params.id, function (err, data) {
       if (err) {
           next(err);
       };

       res.json(data);
   });
   }
   else{
       var query;
        query = pais.find({});
        if (req.query.nombre){
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        query.exec((err, data)=> {
           if (err) return next(err);
           res.json(data);
        });
   }
});

export = router;