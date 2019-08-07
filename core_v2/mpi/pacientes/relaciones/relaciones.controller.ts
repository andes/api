import { SubresourceController } from '../../../../shared/subresource.controller';
import { MemoryQuery } from '@andes/query-builder';
import { Relacion } from '../../../../shared/schemas/relacion';

export class RelacionController extends SubresourceController {

    filter = {
        referencia: MemoryQuery.matchString,
        documento: MemoryQuery.partialString,
        nombre: MemoryQuery.partialString,
        apellido: MemoryQuery.partialString,
        relacion: {
            id: MemoryQuery.matchString,
            nombre: MemoryQuery.partialString,
            opuesto: MemoryQuery.matchString
        }
    };

    key = 'relaciones';
}

export const relacionController = new RelacionController(Relacion);
