import * as express from 'express';
import { EventCore } from '@andes/event-bus';

let router = express.Router();

router.get('/', (req, res) => {
    res.json({
        version: require('../../../package.json').version,
        host: require('os').hostname()
    });
    EventCore.emitAsync('webhooks:hello:example', {});


    // EventCore.emitAsync('version', {
    //     version: require('../../../package.json').version,
    //     name: 'hola'
    //     // host: require('os').hostname()
    // });
    // EventCore.emitAsync('api-status');
});

export = router;
