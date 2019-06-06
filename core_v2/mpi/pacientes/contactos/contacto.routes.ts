import { SubresourceRoutes } from '../../../../shared/subresource.routes';
import { findById, store } from '../paciente.controller';
import { PatientNotFound } from '../paciente.error';
import { Router, Response } from 'express';
import { Auth } from '../../../../auth/auth.class';
import * as asyncHandler from 'express-async-handler';

export class ContactoRoutes extends SubresourceRoutes {

    getPaciente = async (req, res: Response, next) => {
        const paciente = await findById(req.params.idPaciente);
        if (paciente) {
            req.paciente = paciente;
            next();
        } else {
            next(new PatientNotFound());
        }
    }

    async save(resource, req) {
        await store(resource, req);
    }

    getRoutes() {
        this.resourceName = 'paciente';
        this.subresourceName = 'contacto';
        this.subresourceId = 'idContacto';
        const router = Router();
        let id = 'idPaciente';
        router.param(id, asyncHandler(this.getPaciente));
        router.get('/:idPaciente/contactos', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(this.find));
        router.get('/:idPaciente/contactos/:idContacto', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(this.get));
        router.post('/:idPaciente/contactos', Auth.authorize('mpi:paciente:postAndes'), asyncHandler(this.post));
        router.patch('/:idPaciente/contactos/:idContacto', Auth.authorize('mpi:paciente:patchAndes'), asyncHandler(this.patch));
        router.delete('/:idPaciente/contactos/:idContacto', Auth.authorize('mpi:paciente:deleteAndes'), asyncHandler(this.delete));
        return router;
    }


}
