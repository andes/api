import { SubresourceController } from '../../../../shared/subresource.controller';
import { MemoryQuery } from '@andes/query-builder';
import { Direccion } from '../../../../shared/schemas/direccion';

export class DireccionController extends SubresourceController {

    filter = {
        id: MemoryQuery.matchString,
        valor: MemoryQuery.partialString,
        codigoPostal: MemoryQuery.matchString
    };

    key = 'direccion';
}

export const direccionController = new DireccionController(Direccion);
