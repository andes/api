import * as express from 'express';
import { EventCore } from '@andes/event-bus';

let router = express.Router();

router.get('/', (req, res) => {
    res.json({
        version: require('../../../package.json').version
    });
    EventCore.emitAsync('api-version');
});

export = router;
