import * as express from 'express';

let router = express.Router();

router.get('/', async (req, res) => {
    res.json({
        version: require('../../../package.json').version
    });
});

export = router;

