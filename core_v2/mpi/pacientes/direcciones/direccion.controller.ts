import { SubresourceController } from '../../../../shared/subresource.controller';
import { MemoryQuery } from '@andes/query-builder';
import { Direccion } from '../../../../shared/schemas/direccion';
import { IDireccionDoc } from '../../../../shared/interface/Direccion.interface';
import { IPacienteDoc } from '../paciente.interface';
import { getBarrio, geoReferenciar } from '@andes/georef';
import * as Barrio from '../../../../core/tm/schemas/barrio';

export class DireccionController extends SubresourceController {

    filter = {
        id: MemoryQuery.matchString,
        valor: MemoryQuery.partialString,
        codigoPostal: MemoryQuery.matchString
    };

    key = 'direccion';


    /**
     * Georeferencia una direccion de un paciente si la direccion esta completa y no fue georeferenciado manualmente.
     */
    public async geoRefDireccion(paciente: IPacienteDoc, direccion: IDireccionDoc) {
        if (direccion.isCompleted() && !direccion.geoReferencia) {
            const address = direccion.format();
            const coordenadas = await geoReferenciar(address);
            if (coordenadas) {
                this.set(direccion, { geoReferencia: [coordenadas.lat, coordenadas.lng] });
                const nombreBarrio = await getBarrio(coordenadas);
                if (nombreBarrio) {
                    // [TODO] actualizar cuando se haga la refactorización de tabla maestras.
                    const barrio: any = await Barrio.findOne().where('nombre').equals(RegExp('^.*' + nombreBarrio + '.*$', 'i'));
                    if (barrio) {
                        direccion.ubicacion.barrio = barrio;
                    }
                }
            } else {
                direccion.geoReferencia = null;
                direccion.ubicacion.barrio = null;
            }
            this.store(paciente, direccion);
            return true;
        }
        return false;
    }

    /**
     * Geoferencia todas las direccion de un paciente.
     */
    public async geoRefDirecciones(paciente: IPacienteDoc) {
        const direcciones: IDireccionDoc[] = paciente.direccion || [];
        const promise = direcciones.map(async direccion => {
            await this.geoRefDireccion(paciente, direccion);
        });
        await Promise.all(promise);
    }
}

export const direccionController = new DireccionController(Direccion);
