import * as express from 'express';
import { snomedModel } from '../schemas/snomed';
let router = express.Router();

router.get('/', function (req, res, next) {

    let query;

    const conditions = {
        ...req.query.search && {'descriptions.term': { "$regex": req.query.search, "$options": "i" } }
    };
    
    //query.('conceptId, term, active, conceptActive, fsn, module, definitionStatus');

    query = snomedModel.find(conditions);

    query.limit(10);

    query.exec(function (err, data) {
        if (err) {
            next(err);
        };
        res.json(data);
    });


});

export = router;
