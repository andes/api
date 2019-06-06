import { SubresourceController } from '../../../../shared/subresource.controller';
import { partialMatch, equalMatch } from '../../../../packages/query-parser/queryBuilder';
import { Direccion } from '../../../../shared/schemas/direccion';

export class DireccionController extends SubresourceController {

    filter = {
        id: equalMatch,
        valor: partialMatch,
        codigoPostal: equalMatch
    };

    key = 'direccion';
}

export const direccionController = new DireccionController(Direccion);
