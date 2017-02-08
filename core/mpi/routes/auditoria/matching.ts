import * as express from 'express'
import { paciente } from '../../schemas/paciente'

var router = express.Router();

router.get('/matching/:id*?', function (req, res, next) {
    if (req.params.id) {
        paciente.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data); 
        });
    } else {
        var query;
        query = paciente.find({ matchSisa: { $gt: 0.7,  $lte: 0.99 }, estado:'temporal' });
        query.exec((err, data) => {
            if (err) return next(err);
            res.json(data);
        });
    }
});

// router.post('/matching', function (req, res, next) {
//     var newMatching = new paciente(req.body)
//     newMatching.save((err) => {
//         if (err) {
//             return next(err);
//         }
//         res.json(newMatching);
//     })
// });

// router.put('/matching/:id', function (req, res, next) {
//     matching.findByIdAndUpdate(req.params.id, req.body, {new:true}, function (err, data) {
//         if (err) {
//             return next(err);
//         }
//         res.json(data);
//     });
// });

// router.delete('/matching/:_id', function (req, res, next) {
//     matching.findByIdAndRemove(req.params._id, function (err, data) {
//         if (err)
//             return next(err);

//         res.json(data);
//     });
// })

export = router;