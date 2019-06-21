import { SubresourceRoutes } from '../../../../shared/subresource.routes';
import { PacienteCtr } from '../paciente.controller';
import { PatientNotFound } from '../paciente.error';
import { asyncHandler, Request, Response, Router } from '@andes/api';
import { Auth } from '../../../../auth/auth.class';

export class DireccionRoutes extends SubresourceRoutes {
    resourceName = 'paciente';
    subresourceName = 'direccion';

    getPaciente = async (req: Request, res: Response, next) => {
        const paciente = await PacienteCtr.findById(req.params.idPaciente);
        if (paciente) {
            req.resources = req.resources || {};
            req.resources.paciente = paciente;
            return next();
        } else {
            return next(new PatientNotFound());
        }
    }

    async save(resource, req) {
        await PacienteCtr.store(resource, req);
    }

    getRoutes() {
        const router = Router();
        router.param('idPaciente', asyncHandler(this.getPaciente));
        router.get('/:idPaciente/direcciones', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(this.find));
        router.get('/:idPaciente/direcciones/:id', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(this.get));
        router.post('/:idPaciente/direcciones', Auth.authorize('mpi:paciente:postAndes'), asyncHandler(this.post));
        router.patch('/:idPaciente/direcciones/:id', Auth.authorize('mpi:paciente:patchAndes'), asyncHandler(this.patch));
        router.delete('/:idPaciente/direcciones/:id', Auth.authorize('mpi:paciente:deleteAndes'), asyncHandler(this.delete));
        return router;
    }


}
