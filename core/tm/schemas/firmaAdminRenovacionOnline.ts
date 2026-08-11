import { createGridFSBucket } from '../../../shared/gridfs';

export function makeFsFirmaAdminOnline() {
    return createGridFSBucket('ProfesionalesAdminFirmaRenovacionOnline');
}
