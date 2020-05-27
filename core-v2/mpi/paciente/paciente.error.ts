export class PatientNotFound extends Error {
    status = 400;
    message = 'paciente no encontrado';
}

export class PatientDuplicate extends Error {
    status = 400;
    message = 'paciente duplicado';
}
