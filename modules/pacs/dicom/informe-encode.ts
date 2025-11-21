import { IDicomInformeData } from './dicom.interfaces';
/** *
 *
 * https://www.dicomlibrary.com/dicom/dicom-tags/
 * http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html
 */

export function DICOMInformePDFObject(data: IDicomInformeData) {
    const json = {
        '00080005': {
            vr: 'CS',
            Value: [
                'ISO_IR 192'
            ]
        },
        '00080012': {
            vr: 'DA',
            Value: [
                data.instanceCreationDate
            ]
        },
        '00080013': {
            vr: 'TM',
            Value: [
                data.instanceCreationTime
            ]
        },
        '00080016': {
            vr: 'UI',
            Value: [
                '1.2.840.10008.5.1.4.1.1.104.1'
            ]
        },
        '00080018': {
            vr: 'UI',
            Value: [
                data.sopInstanceUID
            ]
        },
        '00080020': {
            vr: 'DA',
            Value: [
                data.studyDate
            ]
        },
        '00080030': {
            vr: 'TM',
            Value: [
                data.studyTime
            ],
        },
        '00080050': {
            vr: 'SH',
            Value: [
                data.orderCode
            ],
        },
        '00080060': {
            vr: 'CS',
            Value: [
                'DOC'
            ]
        },
        '00080064': {
            vr: 'CS',
            Value: [
                'SD'
            ]
        },
        '00080090': {
            vr: 'PN',
            Value: [
                data.profesionalName
            ]
        },
        '0008103E': {
            vr: 'LO',
            Value: [
                'Imported PDF'
            ]
        },
        '00100010': {
            vr: 'PN',
            Value: [
                data.patientName
            ]
        },
        '00100020': {
            vr: 'LO',
            Value: [
                data.pacienteID
            ]
        },
        '0020000D': {
            vr: 'UI',
            Value: [
                data.studyUID
            ]
        },
        '0020000E': {
            vr: 'UI',
            Value: [
                data.seriesUID
            ]
        },
        '00200010': {
            vr: 'SH'
        },
        '00200011': {
            vr: 'IS',
            Value: [
                1
            ]
        },
        '00200013': {
            vr: 'IS',
            Value: [
                1
            ]
        },
        '00280301': {
            vr: 'CS',
            Value: [
                'YES'
            ]
        },
        '00420010': {
            vr: 'ST',
            Value: [
                'Informe Imagenes'
            ]
        },
        '00420011': {
            vr: 'OB',
            BulkDataURI: 'informe.pdf'
        },
        '00420012': {
            vr: 'LO',
            Value: [
                'application/pdf'
            ]
        }
    };

    return json;
}
