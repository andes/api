
import { Auth } from '../../../../auth/auth.class';
import { ResourceBase, MongoQuery } from '@andes/core';
import { SalaComun, SalaComunDocument } from './sala-comun.schema';
import { Request, asyncHandler } from '@andes/api-tool';
import { listarSalaComun, SalaComunIngreso, ingresarPaciente, egresarPaciente } from './sala-comun.controller';

class SalaComunResource extends ResourceBase<SalaComunDocument> {
    Model = SalaComun;
    resourceName = 'sala-comun';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        organizacion: {
            field: 'organizacion.id',
            fn: MongoQuery.matchString
        }
    };

    async presearch(data, req: Request) {
        const orgId = Auth.getOrganization(req);
        return { 'organizacion.id': orgId };
    }
}

export const SalaComunCtr = new SalaComunResource({});
export const SalaComunRouter = SalaComunCtr.makeRoutes();


SalaComunRouter.get('/sala-comun/:id/patients', Auth.authenticate(), asyncHandler(async (req: Request, res) => {
    const idsala = req.params.id;
    const fecha: Date = req.query.fecha;

    const ocupaciones = await listarSalaComun({
        fecha,
        id: idsala,
    });
    res.json(ocupaciones);
}));

SalaComunRouter.get('/sala-comun/patients', Auth.authenticate(), asyncHandler(async (req: Request, res) => {
    const organizacion = Auth.getOrganization(req);
    const fecha: Date = req.query.fecha;

    const ocupaciones = await listarSalaComun({
        fecha,
        organizacion,
    });
    res.json(ocupaciones);
}));

SalaComunRouter.post('/sala-comun/:id/patients', Auth.authenticate(), asyncHandler(async (req: Request, res) => {
    const idsala = req.params.id;
    const dataIngreso: SalaComunIngreso = req.body;
    const movimiento = await ingresarPaciente(idsala, dataIngreso, req);
    res.json(movimiento);
}));

SalaComunRouter.patch('/sala-comun/:id/patients', Auth.authenticate(), asyncHandler(async (req: Request, res) => {
    const idsala = req.params.id;
    const dataIngreso: SalaComunIngreso = req.body;
    const movimiento = await egresarPaciente(idsala, dataIngreso, req);
    res.json(movimiento);
}));
