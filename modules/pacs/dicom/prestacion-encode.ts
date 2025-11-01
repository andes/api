import * as moment from 'moment';
import { IPrestacion } from '../../rup/prestaciones.interface';
import * as base64 from 'base64-mongo-id';
import { IPacsConfig } from '../pacs-config.schema';
/** *
 *
 * https://www.dicomlibrary.com/dicom/dicom-tags/
 * http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html
 */

export function DICOMPrestacion(prestacion: IPrestacion, uniqueID: string, pacienteIdDicom: string, config: IPacsConfig) {
    const { modalidad, aet } = config;

    const patientID = String(pacienteIdDicom);

    const profesional = prestacion.solicitud.profesionalOrigen || prestacion.solicitud.profesional;
    const profesionalID = String(profesional.id);
    const profesionalName = `${profesional.apellido}, ${profesional.nombre}`;

    const tecnico = prestacion.estadoActual.createdBy;
    const tecnicoName = `${tecnico.apellido}, ${tecnico.nombre}`;

    const fecha = prestacion.ejecucion.fecha;
    const json = {
        '00080005': {
            vr: 'CS',
            Value: ['ISO_IR 100']
        },
        '00100020': {
            vr: 'LO',
            Value: [patientID]
        },
        '00100021': {
            vr: 'LO',
            Value: ['ANDES']
        },
        '00321032': {
            vr: 'PN',
            Value: [{ Alphabetic: toISOIR100(profesionalName) }]
        },
        '0020000D': {
            vr: 'UI',
            Value: [uniqueID]
        },
        '00080050': {
            vr: 'SH',
            Value: [base64.toBase64(prestacion.id)]
        },
        '00400100': {
            vr: 'SQ',
            Value: [
                {
                    '00080060': { vr: 'CS', Value: [modalidad] },
                    '00400001': { vr: 'AE', Value: [aet] },
                    '00400002': { vr: 'DA', Value: [moment(fecha).format('YYYYMMDD')] },
                    '00400003': { vr: 'TM', Value: [moment(fecha).format('HHMMSS')] },
                    '00400020': { vr: 'CS', Value: ['SCHEDULED'] },
                    '00400006': { vr: 'PN', Value: [toISOIR100(tecnicoName)] },
                    '0040000B': {
                        vr: 'SQ',
                        Value: [
                            {
                                '00401101': {
                                    vr: 'SQ',
                                    Value: [
                                        {
                                            '00080119': { vr: 'UC', Value: [tecnico.id] }
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
            Value: [toBase64(prestacion.solicitud.tipoPrestacion.conceptId)]
        },
        '00321060': {
            vr: 'LO',
            Value: [toISOIR100(prestacion.solicitud.tipoPrestacion.term)]
        }
    };
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
