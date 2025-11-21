import { IDicomPrestacionData } from './dicom.interfaces';

/** *
 *
 * https://www.dicomlibrary.com/dicom/dicom-tags/
 * http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html
 */

export function DICOMPrestacionObject(prestacion: IDicomPrestacionData) {
    const json = {
        '00080005': {
            vr: 'CS',
            Value: ['ISO_IR 100']
        },
        '00100020': {
            vr: 'LO',
            Value: [prestacion.patientID]
        },
        '00100021': {
            vr: 'LO',
            Value: ['ANDES']
        },
        '00321032': {
            vr: 'PN',
            Value: [{ Alphabetic: prestacion.profesionalName }]
        },
        '0020000D': {
            vr: 'UI',
            Value: [prestacion.uniqueID]
        },
        '00080050': {
            vr: 'SH',
            Value: [prestacion.accessionNumber]
        },
        '00400100': {
            vr: 'SQ',
            Value: [
                {
                    '00080060': { vr: 'CS', Value: [prestacion.modality] },
                    '00400001': { vr: 'AE', Value: [prestacion.aet] },
                    '00400002': { vr: 'DA', Value: [prestacion.scheduledDate] },
                    '00400003': { vr: 'TM', Value: [prestacion.scheduledTime] },
                    '00400020': { vr: 'CS', Value: ["SCHEDULED"] },
                    '00400006': { vr: 'PN', Value: [prestacion.tecnicoName] }
                }
            ]
        },
        '00401001': {
            vr: 'SH',
            Value: [prestacion.procedureCode]
        },
        '00321060': {
            vr: 'LO',
            Value: [prestacion.procedureDescription]
        }
    };
    return json;
}
