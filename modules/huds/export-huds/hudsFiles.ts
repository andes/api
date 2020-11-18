import { makeFs, readFile as readFileBase } from '../../../core/tm/controller/file-storage';

export function getHUDSExportarModel() {
    return makeFs('HUDSExportar');
}

export function readFile(id): Promise<any> {
    return readFileBase(id, 'HUDSExportar');
}
