import { createGridFSBucket } from '../../../shared/gridfs';

export function makeFsImagenOnline() {
    return createGridFSBucket('ProfesionalesImagenRenovacionOnline');
}
