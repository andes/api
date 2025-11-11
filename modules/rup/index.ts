import * as express from 'express';
import { ElementoRUPRouter } from './elementos-rup.controller';
import { CamasRouter, CensosRouter, EstadosRouter, InternacionResumenRouter, InternacionRouter, PlanIndicacionesEventosRouter, PlanIndicacionesRouter, SalaComunRouter } from './internacion';
import { InformeEstadisticaRouter } from './internacion/informe-estadistica.routes';
require('./controllers/rup.events');

export function setup(app: express.Application) {
    app.use('/api/modules/rup', ElementoRUPRouter);
    app.use('/api/modules/rup/internacion', CamasRouter);
    app.use('/api/modules/rup/internacion', EstadosRouter);
    app.use('/api/modules/rup/internacion', CensosRouter);
    app.use('/api/modules/rup/internacion', SalaComunRouter);
    app.use('/api/modules/rup/internacion', InternacionRouter);
    app.use('/api/modules/rup/internacion', InternacionResumenRouter);
    app.use('/api/modules/rup/internacion', PlanIndicacionesRouter);
    app.use('/api/modules/rup/internacion', PlanIndicacionesEventosRouter);
    app.use('/api/modules/rup/internacion', InformeEstadisticaRouter);

}

export { hudsPaciente } from './controllers/prestacion';
