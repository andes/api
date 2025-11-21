import * as moment from 'moment';
import { IPrestacion } from '../../rup/prestaciones.interface';
import { IPacsConfig } from '../pacs-config.schema';
import { IDicomPatientData, DICOM_SHORT_STRING_MAX_LENGTH, IDicomPrestacionData, IDicomInformeData } from './dicom.interfaces';

export const toISOIR100 = (text: string) => {
    const buffer = require('buffer');
    const latin1Buffer = buffer.transcode(Buffer.from(text), 'utf8', 'latin1');
    return latin1Buffer.toString('latin1');
};

export const normalizeShortString = (value?: string, reverse = false): string  => {
    if (!value) {
        return '';
    }
    
    const trimmed = value.trim().replace(/\s+/g, ' ');

    if (trimmed.length <= DICOM_SHORT_STRING_MAX_LENGTH) {
        return trimmed;
    }

    if (reverse) {
        return trimmed.slice(-DICOM_SHORT_STRING_MAX_LENGTH);
    }

    return trimmed.substring(0, DICOM_SHORT_STRING_MAX_LENGTH);
};

export const buildDicomName = (apellido?: string, nombre?: string) => {
    const normalizedApellido = normalizeShortString(apellido);
    const normalizedNombre = normalizeShortString(nombre);

    const dicomNameRaw = `${normalizedApellido}^${normalizedNombre}`;
    const truncatedDicomName = dicomNameRaw.substring(0, DICOM_SHORT_STRING_MAX_LENGTH);
    return toISOIR100(truncatedDicomName);
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
    const pacienteIdDicom = (config.featureFlags?.usoIdDNI && paciente.documento)
        ? paciente.documento
        : String(paciente.id);

    const dicomName = buildDicomName(paciente.apellido, paciente.nombre);

    return {
        id: pacienteIdDicom,
        documento: paciente.documento,
        fechaNacimiento: formatDicomDate(paciente.fechaNacimiento),
        sexo: mapDicomGender(paciente.sexo),
        dicomName
    };
}

export function DICOMPrestacion(prestacion: IPrestacion, pacienteIdDicom: string, config: IPacsConfig): IDicomPrestacionData {

    const { modalidad, aet } = config;
    const patientID = pacienteIdDicom;

    const profesional = prestacion.solicitud.profesionalOrigen || prestacion.solicitud.profesional;
    const profesionalName = buildDicomName(profesional.apellido, profesional.nombre);

    const tecnico = prestacion.estadoActual.createdBy;
    const tecnicoName = buildDicomName(tecnico.apellido, tecnico.nombre);

    const scheduledDate = formatDicomDate(prestacion.ejecucion.fecha);
    const scheduledTime = formatDicomTime(prestacion.ejecucion.fecha);
    const uniqueID = `${config.ui}.${Date.now()}`;

    return {
        patientID,
        uniqueID,
        accessionNumber: base64.toBase64(prestacion.id),
        modality: modalidad,
        aet,
        scheduledDate,
        scheduledTime,
        profesionalName,
        tecnicoName,
        procedureCode: normalizeShortString(prestacion.solicitud.tipoPrestacion.conceptId),
        procedureDescription: toISOIR100(normalizeShortString(prestacion.solicitud.tipoPrestacion.term))
    };
}

export function DICOMInforme(prestacion: IPrestacion, paciente: IDicomPatientData): IDicomInformeData {
    const uid = prestacion.metadata.find(item => item.key === 'pacs-uid')?.valor as string;
    const profesional = prestacion.solicitud.profesionalOrigen || prestacion.solicitud.profesional;
    const profesionalName = `${profesional.apellido}, ${profesional.nombre}`;
    const orderCode = toISOIR100(prestacion.solicitud.tipoPrestacion.conceptId);
    const studyDate = formatDicomDate(prestacion.ejecucion.fecha);
    const studyTime = formatDicomTime(prestacion.ejecucion.fecha);
    const instanceCreationDate = formatDicomDate(new Date());
    const instanceCreationTime = formatDicomTime(new Date());

    return {
        studyUID: uid,
        seriesUID: `${uid}.2`,
        sopInstanceUID: `${uid}.1`,
        patientID: paciente.id,
        patientName: paciente.dicomName,
        profesionalName,
        orderCode,
        studyDate,
        studyTime,
        instanceCreationDate,
        instanceCreationTime
    };
}
