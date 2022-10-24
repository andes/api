import * as moment from 'moment';

export function DICOMPaciente(patient) {
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
                String(patient.id)
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
                toISOIR100(`${patient.apellido}^${patient.nombre}`)
            ]
        },
        '00100040': {
            vr: 'CS',
            Value: [
                patient.sexo === 'masculino' ? 'M' : 'F'
            ]
        }
    };

    if (patient.documento) {
        json['00101002'] = {
            vr: 'SQ',
            Value: [
                {
                    '00100020': {
                        vr: 'LO',
                        Value: [
                            patient.documento
                        ]
                    }
                }
            ]
        };
    }
    if (patient.fechaNacimiento) {
        json['00100030'] = {
            vr: 'DA',
            Value: [
                moment(patient.fechaNacimiento).format('YYYYMMDD')
            ]
        };
    }
    return json;
}

export function toBase64(text: string) {
    return Buffer.from(text).toString('base64');
}

export function toISOIR100(text: string) {
    //var buf = Buffer.from(text, 'utf8');
    const buffer = require('buffer');
    const latin1Buffer = buffer.transcode(Buffer.from(text), "utf8", "latin1");
    return latin1Buffer.toString("latin1");
    //return Buffer.from(text).toString('latin1');
}
