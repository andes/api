import { HL7v2Config } from './hl7v2-config.schema';
import { ObjectId } from '@andes/core';
import * as mongoose from 'mongoose';

export async function getConfigHl7(organizacionId: ObjectId, conceptId: string, tipoMensaje: string): Promise<any> {
    const orgId = new mongoose.Types.ObjectId(organizacionId);
    const config = await HL7v2Config.findOne({
        'organizacion.id': orgId,
        'tipoPrestacion.conceptId': conceptId,
        tipoMensaje
    });

    if (!config) {
        return null;
    }

    return config;
}
