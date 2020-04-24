import { ElementoRUPRouter } from './elementos-rup.controller';
import * as express from 'express';

export function setup(app: express.Application) {
    app.use('/api/modules/rup', ElementoRUPRouter);
}
