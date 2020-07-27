import * as express from 'express';
import { ElementoRUPRouter } from './elementos-rup.controller';
import { CamasRouter, CensosRouter, EstadosRouter, InternacionRouter } from './internacion';


export function setup(app: express.Application) {
    app.use('/api/modules/rup', ElementoRUPRouter);
    app.use('/api/modules/rup/internacion', CamasRouter);
    app.use('/api/modules/rup/internacion', CensosRouter);
    app.use('/api/modules/rup/internacion', EstadosRouter);
    app.use('/api/modules/rup/internacion', InternacionRouter);
}
