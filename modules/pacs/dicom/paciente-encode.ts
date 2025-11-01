import * as moment from 'moment';
import { IPacsConfig } from '../pacs-config.schema';

export function DICOMPaciente(paciente: any, pacienteIdDicom: string, config: IPacsConfig) {
    const json = {
        '00080005': {
            vr: 'CS',
            Value: [
                'ISO_IR 100'
            ]
        },
        '00100020': {
            vr: 'LO',
            Value: [
                pacienteIdDicom
            ]
        },
        '00100021': {
            vr: 'LO',
            Value: [
                'ANDES'
            ]
        },
        '00100010': {
            vr: 'PN',
            Value: [
                toISOIR100(`${paciente.apellido}^${paciente.nombre}`)
            ]
        },
        '00100040': {
            vr: 'CS',
            Value: [
                paciente.sexo === 'masculino' ? 'M' : 'F'
            ]
        }
    };

    if (paciente.documento) {
        json['00101002'] = {
            vr: 'SQ',
            Value: [
                {
                    '00100020': {
                        vr: 'LO',
                        Value: [
                            paciente.documento
                        ]
                    }
                }
            ]
        };
    }
    if (paciente.fechaNacimiento) {
        json['00100030'] = {
            vr: 'DA',
            Value: [
                moment(paciente.fechaNacimiento).format('YYYYMMDD')
            ]
        };
    }
    return json;
}

export function toBase64(text: string) {
    return Buffer.from(text).toString('base64');
}

export function toISOIR100(text: string) {
    const buffer = require('buffer');
    const latin1Buffer = buffer.transcode(Buffer.from(text), 'utf8', 'latin1');
    return latin1Buffer.toString('latin1');
}
