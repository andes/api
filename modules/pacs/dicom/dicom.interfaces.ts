export const DICOM_SHORT_STRING_MAX_LENGTH = 16;
export const DICOM_LONG_STRING_MAX_LENGTH = 64;

export interface IDicomPatientData {
    id: string;
    pacienteIDtrimmed: string;
    dicomName: string;
    documento?: string;
    fechaNacimiento?: string;
    sexo?: string;
}

export interface IDicomPrestacionData {
    pacienteID: string;
    uniqueID: string;
    accessionNumber: string;
    modalidad: string;
    aet: string;
    scheduledDate: string;
    scheduledTime: string;
    profesionalName: string;
    tecnicoName: string;
    procedureCode: string;
    procedureDescription: string;
}

export interface IDicomInformeData {
    studyUID: string;
    seriesUID: string;
    sopInstanceUID: string;
    pacienteID: string;
    patientName: string;
    profesionalName: string;
    orderCode: string;
    studyDate: string;
    studyTime: string;
    instanceCreationDate: string;
    instanceCreationTime: string;
}
