import { SubresourceRoutes } from '../../../../shared/subresource.routes';
import { PatientNotFound } from '../paciente.error';

export class RelacionRoutes extends SubresourceRoutes {
    resourceName = 'paciente';
    subresourceName = 'relaciones';
    notFoundError = PatientNotFound;
    permisos = {
        find: 'mpi:paciente:getbyId',
        get: 'mpi:paciente:getbyId',
        post: 'mpi:paciente:postAndes',
        patch: 'mpi:paciente:patchAndes',
        delete: 'mpi:paciente:deleteAndes'
    };
}
