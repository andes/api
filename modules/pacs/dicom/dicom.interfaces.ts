export const DICOM_SHORT_STRING_MAX_LENGTH = 16;

export interface IDicomPatientData {
    id: string;
    dicomName: string;
    documento?: string;
    fechaNacimiento?: string;
    sexo?: string;
}

export interface IDicomPrestacionData {
    patientID: string;
    uniqueID: string;
    accessionNumber: string;
    modality: string;
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
    patientID: string;
    patientName: string;
    profesionalName: string;
    orderCode: string;
    studyDate: string;
    studyTime: string;
    instanceCreationDate: string;
    instanceCreationTime: string;
}
