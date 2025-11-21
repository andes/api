import { IDicomPatientData } from './dicom.interfaces';

export function DICOMPacienteObject(paciente: IDicomPatientData) {
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
                paciente.id
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
                paciente.dicomName
            ]
        },
        '00100040': {
            vr: 'CS',
            Value: [
                paciente.sexo
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
                            paciente.pacienteIDtrimmed
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
                paciente.fechaNacimiento
            ]
        };
    }
    return json;
}
