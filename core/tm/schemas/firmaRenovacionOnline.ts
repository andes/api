import { createGridFSBucket } from '../../../shared/gridfs';

export function makeFsFirmaOnline() {
    return createGridFSBucket('ProfesionalesFirmaRenovacionOnline');
}
