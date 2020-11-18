import * as express from 'express';
import { ExportHudsRouter } from './exportHuds.routes';

export function setup(app: express.Application) {
    app.use('/api/modules/huds', ExportHudsRouter);
}
