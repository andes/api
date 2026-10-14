import { createGridFSBucket } from '../../../../shared/gridfs';

export function make_Fs() {
    return createGridFSBucket('RestriccionHUDSStore');
}
