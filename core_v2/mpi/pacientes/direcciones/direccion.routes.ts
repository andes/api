import { SubresourceRoutes } from '../../../../shared/subresource.routes';
import { findById, storePaciente } from '../paciente.controller';
import { PatientNotFound } from '../paciente.error';
import { Router, Response } from 'express';
import { Auth } from '../../../../auth/auth.class';
import * as asyncHandler from 'express-async-handler';

export class DireccionRoutes extends SubresourceRoutes {

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
        await storePaciente(resource, req);
    }

    getRoutes() {
        this.resourceName = 'paciente';
        this.subresourceName = 'direccion';
        const router = Router();
        let id = 'idPaciente';
        router.param(id, asyncHandler(this.getPaciente));
        router.get('/:idPaciente/direcciones', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(this.find));
        router.get('/:idPaciente/direcciones/:idDireccion', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(this.get));
        router.post('/:idPaciente/direcciones', Auth.authorize('mpi:paciente:postAndes'), asyncHandler(this.post));
        router.patch('/:idPaciente/direcciones/:idDireccion', Auth.authorize('mpi:paciente:patchAndes'), asyncHandler(this.patch));
        router.delete('/:idPaciente/direcciones/:idDireccion', Auth.authorize('mpi:paciente:deleteAndes'), asyncHandler(this.delete));
        return router;
    }


}
