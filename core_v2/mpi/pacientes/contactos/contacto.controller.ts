import { SubresourceController } from '../../../../shared/subresource.controller';
import { partialMatch, equalMatch } from '../../../../packages/query-parser/queryBuilder';
import { Contacto } from '../../../../shared/schemas/contacto';

export class ContactoController extends SubresourceController {

    filter = {
        id: equalMatch,
        valor: partialMatch,
        tipo: equalMatch

    };

    key = 'contacto';
}

export const contactoController = new ContactoController(Contacto);
