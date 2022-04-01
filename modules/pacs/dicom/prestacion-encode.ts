import * as moment from 'moment';
import { IPrestacion } from '../../rup/prestaciones.interface';
/** *
 *
 * https://www.dicomlibrary.com/dicom/dicom-tags/
 * http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html
 */
export interface DICOMWorklistConfig {
    modality: string;
    aet: string;
    ui: string;
}
export function DICOMPrestacion(prestacion: IPrestacion, options: DICOMWorklistConfig) {
    const { modality, aet, ui } = options;
    const uniqueID = ui;

    const patientID = String(prestacion.paciente.id);

    const profesional = prestacion.solicitud.profesionalOrigen || prestacion.solicitud.profesional;
    const profesionalID = String(profesional.id);
    const profesionalName = `${profesional.apellido}, ${profesional.nombre}`;

    const tecnico = prestacion.estadoActual.createdBy;
    const tecnicoName = `${tecnico.apellido}, ${tecnico.nombre}`;

    const fecha = prestacion.ejecucion.fecha;

    const json = {
        '00080005': {
            vr: 'CS',
            Value: [
                'ISO_IR 192'
            ]
        },
        '00100020': {
            vr: 'LO',
            Value: [
                patientID
            ]
        },
        '00100021': {
            vr: 'LO',
            Value: [
                'ANDES'
            ]
        },
        '00321032': {
            vr: 'PN',
            Value: [
                {
                    Alphabetic: profesionalName
                }
            ]
        },
        '0020000D': {
            vr: 'UI',
            Value: [
                uniqueID
            ]
        },
        '00080050': {
            vr: 'SH',
            Value: [
                toBase64(String(prestacion.id))

            ]
        },
        '00400100': {
            vr: 'SQ',
            Value: [
                {
                    '00080060': {
                        vr: 'CS',
                        Value: [
                            modality
                        ]
                    },
                    '00400001': {
                        vr: 'AE',
                        Value: [
                            aet
                        ]
                    },
                    '00400002': {
                        vr: 'DA',
                        Value: [
                            moment(fecha).format('YYYYMMDD')
                        ]
                    },
                    '00400003': {
                        vr: 'TM',
                        Value: [
                            moment(fecha).format('HHMMSS')
                        ]
                    },
                    '00400020': {
                        vr: 'CS',
                        Value: [
                            'SCHEDULED'
                        ]
                    },
                    '00400006': {
                        vr: 'PN',
                        Value: [
                            tecnicoName
                        ]
                    },
                    '0040000B': {
                        vr: 'SQ',
                        Value: [
                            {
                                '00401101': {
                                    vr: 'SQ',
                                    Value: [
                                        {
                                            '00080119': {
                                                vr: 'UC',
                                                Value: [
                                                    tecnico.id
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        },
        '00401001': {
            vr: 'SH',
            Value: [
                toBase64(prestacion.solicitud.tipoPrestacion.conceptId)
            ]
        },
        '00321060': {
            vr: 'LO',
            Value: [
                prestacion.solicitud.tipoPrestacion.term
            ]
        }
    };
    return json;
}

export function toBase64(text: string) {
    return Buffer.from(text).toString('base64');
}
