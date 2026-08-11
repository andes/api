import { createGridFSBucket } from '../../../shared/gridfs';

export function makeFs() {
    return createGridFSBucket('CDAFiles');
}
