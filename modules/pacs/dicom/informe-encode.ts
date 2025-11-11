import { IPrestacion } from '../../rup/prestaciones.interface';
import * as moment from 'moment';
/** *
 *
 * https://www.dicomlibrary.com/dicom/dicom-tags/
 * http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html
 */

export function DICOMInformePDF(prestacion: IPrestacion, pacienteIdDicom: string) {
    const { valor: uid } = prestacion.metadata.find(item => item.key === 'pacs-uid');


    const patientID = pacienteIdDicom;

    const profesional = prestacion.solicitud.profesionalOrigen || prestacion.solicitud.profesional;
    const profesionalID = String(profesional.id);
    const profesionalName = `${profesional.apellido}, ${profesional.nombre}`;

    const tecnico = prestacion.estadoActual.createdBy;
    const tecnicoName = `${tecnico.apellido}, ${tecnico.nombre}`;

    const fecha = prestacion.ejecucion.fecha;

    const patient = prestacion.paciente;

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
                moment().format('YYYYMMDD')
            ]
        },
        '00080013': {
            vr: 'TM',
            Value: [
                moment().format('HHMM')
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
                `${uid}.1`
            ]
        },
        '00080020': {
            vr: 'DA',
            Value: [
                moment(fecha).format('YYYYMMDD')
            ]
        },
        '00080030': {
            vr: 'TM',
            Value: [
                moment(fecha).format('HHMM')
            ],
        },
        '00080050': {
            vr: 'SH',
            Value: [
                toBase64(prestacion.solicitud.tipoPrestacion.conceptId)
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
                profesionalName
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
                `${patient.apellido}^${patient.nombre}`
            ]
        },
        '00100020': {
            vr: 'LO',
            Value: [
                patientID
            ]
        },
        '0020000D': {
            vr: 'UI',
            Value: [
                `${uid}`
            ]
        },
        '0020000E': {
            vr: 'UI',
            Value: [
                `${uid}.2`
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

export function toBase64(text: string) {
    return Buffer.from(text).toString('base64');
}
