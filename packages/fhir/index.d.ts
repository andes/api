export as namespace fhir;

export interface Fhir {
    /**
     * @param {any} object objet to convert
     * @param {any} params Arguments
     */
    patientToFhir(object: any, ...params: any[]);
    patientToAndes(object: any, ...params: any[]);
    patientFhirValidator(object);
}

export declare const FhirCore: Fhir;
