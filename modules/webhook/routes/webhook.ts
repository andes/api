import * as express from 'express';
import { EventCore } from '@andes/event-bus';

let router = express.Router();

EventCore.on(/.*/, function () {
    // console.log(this.event, arguments);
});

export = router;
