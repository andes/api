import * as express from 'express';

let router = express.Router();

router.get('/', (req, res) => {
    res.json({
        version: require('../../../package.json').version
    });
});

export = router;
