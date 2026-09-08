import * as moment from 'moment';
import { IPrestacion } from '../../rup/prestaciones.interface';
import { IPacsConfig } from '../pacs-config.schema';
import { IDicomPatientData, DICOM_SHORT_STRING_MAX_LENGTH, DICOM_LONG_STRING_MAX_LENGTH, IDicomPrestacionData, IDicomInformeData } from './dicom.interfaces';

const objectIdToBase64 = (id: string) => Buffer.from(id, 'hex').toString('base64url' as BufferEncoding);

export const toISOIR100 = (text: string) => {
    const buffer = require('buffer');
    const latin1Buffer = buffer.transcode(Buffer.from(text), 'utf8', 'latin1');
    return latin1Buffer.toString('latin1');
};

export const normalizeShortString = (value?: string, reverse = false, maxLength = DICOM_SHORT_STRING_MAX_LENGTH): string => {
    if (!value) {
        return '';
    }
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (trimmed.length <= maxLength) {
        return trimmed;
    }
    if (reverse) {
        return trimmed.slice(-maxLength);
    }
    return trimmed.substring(0, maxLength);
};

export const buildDicomName = (apellido?: string, nombre?: string) => {
    const normalizedApellido = normalizeShortString(apellido, false, DICOM_LONG_STRING_MAX_LENGTH);
    const normalizedNombre = normalizeShortString(nombre, false, DICOM_LONG_STRING_MAX_LENGTH);

    const dicomNameRaw = normalizeShortString(
        `${normalizedApellido}^${normalizedNombre}`,
        false,
        DICOM_LONG_STRING_MAX_LENGTH
    );

    return toISOIR100(dicomNameRaw);
};

export const formatDicomDate = (fecha?: string | Date) => {
    if (!fecha) {
        return null;
    }
    return moment(fecha).format('YYYYMMDD');
};

export const formatDicomTime = (fecha?: string | Date ) => {
    if (!fecha) {
        return null;
    }
    return moment(fecha).format('HHMMSS');
};

export const mapDicomGender = (sexo?: string) => sexo === 'masculino' ? 'M' : 'F';

export function DICOMPaciente(config: IPacsConfig, paciente: any): IDicomPatientData {
    const pacienteId = String(paciente.id);
    const pacienteIDtrimmed = normalizeShortString(pacienteId, true, 15);
    const usoIdDNI = config.featureFlags?.usoIdDNI;
    const pacienteIdDicom = usoIdDNI
        ? (paciente.documento || pacienteIDtrimmed)
        : pacienteId;
    const id = pacienteIdDicom;
    const dicomName = buildDicomName(paciente.apellido, paciente.nombre);
    const documento = paciente.documento;
    const fechaNacimiento = formatDicomDate(paciente.fechaNacimiento);
    const sexo = mapDicomGender(paciente.sexo);

    // Other Patient ID: cuando hay documento, el campo alternativo es el otro
    // identificador (sufijo ObjectId si el principal es el DNI, o el DNI si el
    // principal es el ObjectId completo).
    const otherPatientId = documento
        ? (usoIdDNI ? pacienteIDtrimmed : documento)
        : undefined;

    return {
        id,
        pacienteIDtrimmed,
        documento,
        otherPatientId,
        fechaNacimiento,
        sexo,
        dicomName
    };
}

export function DICOMPrestacion(prestacion: IPrestacion, pacienteIdDicom: string, config: IPacsConfig): IDicomPrestacionData {
    const { modalidad, aet } = config;
    const pacienteID = pacienteIdDicom;
    const profesional = prestacion.solicitud.profesionalOrigen || prestacion.solicitud.profesional;
    const profesionalName = buildDicomName(profesional.apellido, profesional.nombre);
    const tecnico = prestacion.estadoActual.createdBy;
    const tecnicoName = buildDicomName(tecnico.apellido, tecnico.nombre);
    const scheduledDate = formatDicomDate(prestacion.ejecucion.fecha);
    const scheduledTime = formatDicomTime(prestacion.ejecucion.fecha);
    const uniqueID = `${config.ui}.${Date.now()}`;
    const accessionNumber = objectIdToBase64(String(prestacion.id));
    const procedureCode = normalizeShortString(prestacion.solicitud.tipoPrestacion.conceptId);
    const procedureDescription = toISOIR100(normalizeShortString(prestacion.solicitud.tipoPrestacion.term));

    return {
        pacienteID,
        uniqueID,
        accessionNumber,
        modalidad,
        aet,
        scheduledDate,
        scheduledTime,
        profesionalName,
        tecnicoName,
        procedureCode,
        procedureDescription
    };
}

export function DICOMInforme(prestacion: IPrestacion, paciente: IDicomPatientData): IDicomInformeData {
    const uid = prestacion.metadata.find(item => item.key === 'pacs-uid')?.valor as string;
    const accessionNumber = prestacion.metadata.find(item => item.key === 'pacs-accessionNumber')?.valor as string;
    const profesional = prestacion.solicitud.profesionalOrigen || prestacion.solicitud.profesional;
    const profesionalName = buildDicomName(profesional.apellido, profesional.nombre);
    const studyDate = formatDicomDate(prestacion.ejecucion.fecha);
    const studyTime = formatDicomTime(prestacion.ejecucion.fecha);
    const instanceCreationDate = formatDicomDate(new Date());
    const instanceCreationTime = formatDicomTime(new Date());

    return {
        studyUID: uid,
        seriesUID: `${uid}.2`,
        sopInstanceUID: `${uid}.1`,
        pacienteID: paciente.id,
        patientName: paciente.dicomName,
        profesionalName,
        accessionNumber,
        studyDate,
        studyTime,
        instanceCreationDate,
        instanceCreationTime
    };
}
