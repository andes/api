import * as express from 'express'
import * as organization from '../schemas/organization'
import * as utils from '../utils/utils';

var router = express.Router();

router.get('/organization/:id*?', function(req, res, next) {
    if (req.params.id) {
        
        organization.findById(req.params.id, function (err, data) {
        if (err) {
            next(err);
        };

        res.json(data);
    });
    }
    else {
        var query;
        var opciones = {};
        
        
        if (req.query.search) {
            
            if (req.query.search) {
                opciones['$or'] = [{
                    "name": {
                        "$regex": utils.makePattern(req.query.search)
                    }
                }]

            }

        }

        query = organization.find(opciones);

        query.exec(function(err, data) {
            if (err) return next(err);
            res.json(data);
        });
        
    }
});

router.post('/organization', function (req, res, next) {
    var newOrganization = new organization(req.body);
    newOrganization.save((err) => {
        if (err) {
            next(err);
        }

        res.json(newOrganization);
    });
});

router.put('/organization/:_id', function (req, res, next) {
    organization.findByIdAndUpdate(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
});

router.delete('/organization/:_id', function (req, res, next) {
    organization.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;







