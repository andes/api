
import { Auth } from '../../../../auth/auth.class';
import { ResourceBase, MongoQuery } from '@andes/core';
import { SalaEspera } from './sala-espera.schema';
import { Request, asyncHandler } from '@andes/api-tool';
import { listarSalaEspera, SalaEsperaIngreso, ingresarPaciente, egresarPaciente } from './sala-espera.controller';

class SalaEsperaResource extends ResourceBase {
    Model = SalaEspera;
    resourceName = 'sala-espera';
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

export const SalaEsperaCtr = new SalaEsperaResource({});
export const SalaEsperaRouter = SalaEsperaCtr.makeRoutes();


SalaEsperaRouter.get('/sala-espera/:id/patients', Auth.authenticate(), asyncHandler(async (req: Request, res) => {
    const idsala = req.params.id;
    const fecha: Date = req.query.fecha;

    const ocupaciones = await listarSalaEspera({
        fecha,
        id: idsala,
    });
    res.json(ocupaciones);
}));

SalaEsperaRouter.get('/sala-espera/patients', Auth.authenticate(), asyncHandler(async (req: Request, res) => {
    const organizacion = Auth.getOrganization(req);
    const fecha: Date = req.query.fecha;

    const ocupaciones = await listarSalaEspera({
        fecha,
        organizacion,
    });
    res.json(ocupaciones);
}));

SalaEsperaRouter.post('/sala-espera/:id/patients', Auth.authenticate(), asyncHandler(async (req: Request, res) => {
    const idsala = req.params.id;
    const dataIngreso: SalaEsperaIngreso = req.body;
    const movimiento = await ingresarPaciente(idsala, dataIngreso, req);
    res.json(movimiento);
}));

SalaEsperaRouter.delete('/sala-espera/:id/patients', Auth.authenticate(), asyncHandler(async (req: Request, res) => {
    const idsala = req.params.id;
    const dataIngreso: SalaEsperaIngreso = req.body;
    const movimiento = await egresarPaciente(idsala, dataIngreso, req);
    res.json(movimiento);
}));
