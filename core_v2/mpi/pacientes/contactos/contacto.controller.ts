import { SubresourceController } from '../../../../shared/subresource.controller';
import { MemoryQuery } from '@andes/query-builder';
import { Contacto } from '../../../../shared/schemas/contacto';

export class ContactoController extends SubresourceController {

    filter = {
        id: MemoryQuery.matchString,
        valor: MemoryQuery.partialString,
        tipo: MemoryQuery.matchString

    };

    key = 'contacto';
}

export const contactoController = new ContactoController(Contacto);
