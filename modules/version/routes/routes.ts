import * as express from 'express';
import * as config from '../../../config.private';
const router = express.Router();

router.get('/', async (req, res) => {
    res.json({
        version: require('../../../package.json').version,
        snomed: config.snomed.snowstormBranch
    });
});

export = router;

