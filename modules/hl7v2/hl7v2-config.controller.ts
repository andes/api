import { HL7v2Config } from './hl7v2-config.schema';
import { ObjectId } from '@andes/core';

export async function getConfigHl7(organizacionId: ObjectId, conceptId: string, tipoMensaje: string): Promise<any> {
    const config = await HL7v2Config.findOne({
        'organizacion._id': organizacionId,
        'tipoPrestacion.conceptId': conceptId,
        tipoMensaje
    });

    if (!config) {
        return null;
    }

    return config;
}
