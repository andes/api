import { createGridFSBucket } from '../../../shared/gridfs';

export function makeFsFirmaAdmin() {
    return createGridFSBucket('ProfesionalesFirmaAdmin');
}
