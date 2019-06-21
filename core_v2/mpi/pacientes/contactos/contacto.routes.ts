import { SubresourceRoutes } from '../../../../shared/subresource.routes';
import { PacienteCtr } from '../paciente.controller';
import { PatientNotFound } from '../paciente.error';
import { Auth } from '../../../../auth/auth.class';
import { asyncHandler, Request, Response, Router } from '@andes/api';

export class ContactoRoutes extends SubresourceRoutes {
    resourceName = 'paciente';
    subresourceName = 'contacto';
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
        router.get('/:idPaciente/contactos', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(this.find));
        router.get('/:idPaciente/contactos/:id', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(this.get));
        router.post('/:idPaciente/contactos', Auth.authorize('mpi:paciente:postAndes'), asyncHandler(this.post));
        router.patch('/:idPaciente/contactos/:id', Auth.authorize('mpi:paciente:patchAndes'), asyncHandler(this.patch));
        router.delete('/:idPaciente/contactos/:id', Auth.authorize('mpi:paciente:deleteAndes'), asyncHandler(this.delete));
        return router;
    }


}
