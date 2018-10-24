import { PacienteFHIR } from './../../interfaces/IPacienteFHIR';

function pacienteFHIRFields(elem: string) {
    return elem.match('resourceType|identifier|active|name|telecom|gender|birthDate|deceasedBoolean|deceasedDateTime|address|maritalStatus|photo|contact') != null;
}

function identifierFields(elem: string) {
    return elem.match('use|type|system|value|period|assigner') != null;
}

function nameFields(elem: string) {
    return elem.match('resourceType|family|given') != null;
}

function telecomFields(elem: string) {
    return elem.match('resourceType|system|value|use|rank|period') != null;
}

function addressFields(elem: string) {
    return elem.match('resourceType|use|type|text|line|city|district|state|postalCode|country|period') != null;
}

function codingFields(elem: string) {
    return elem.match('coding|text') != null;
}

function photoFields(elem: string) {
    return elem.match('contentType|language|data|url|size|hash|title|creation') != null;
}

/*
function contactFields(elem: string) {
    return elem.match('relationship|name|telecom|address|gender|organization|period') != null;
}
*/

function validName(aName) {
    return Object.keys(aName).every(nameFields) && ('resourceType' in aName) && aName.resourceType === 'HumanName'
        && ('family' in aName) && Array.isArray(aName.family) && aName.family.every(areStrings)
        && ('given' in aName) && Array.isArray(aName.given) && aName.given.every(areStrings);
}

function areStrings(elem: string) {
    return typeof elem === 'string';
}

export function validate(pacienteFhir: PacienteFHIR): boolean {
    // Esta función valida un objeto paciente FHIR y devuelve si es sintácticamente correcto o no.
    let respuesta = true;
    const fieldVerified = Object.keys(pacienteFhir).every(pacienteFHIRFields);
    // Verificamos que las key esten contenidas en los conjuntos mínimos pacienteFHIRField
    if (fieldVerified) {
        respuesta = ('resourceType' in pacienteFhir) && pacienteFhir.resourceType === 'Patient';
        respuesta = respuesta && ('identifier' in pacienteFhir);
        if (pacienteFhir.identifier.length > 0) {
            pacienteFhir.identifier.forEach(anIdentifier => {
                respuesta = respuesta && Object.keys(anIdentifier).every(identifierFields);
                if (anIdentifier.assigner) {
                    respuesta = respuesta && typeof anIdentifier.assigner === 'string';
                }
                if (anIdentifier.value) {
                    respuesta = respuesta && typeof anIdentifier.value === 'string';
                }
            });

        }
        pacienteFhir.name.forEach(aName => {
            respuesta = respuesta && validName(aName);
        });
        if (pacienteFhir.active) {
            respuesta = respuesta && (typeof pacienteFhir.active === 'boolean');
        }
        if (pacienteFhir.telecom) {
            pacienteFhir.telecom.forEach(aTelecom => {
                respuesta = respuesta && Object.keys(aTelecom).every(telecomFields);
                respuesta = respuesta && ('resourceType' in aTelecom) && aTelecom.resourceType === 'ContactPoint';
                if (aTelecom.value) {
                    respuesta = respuesta && typeof aTelecom.value === 'string';
                }
                if (aTelecom.rank) {
                    respuesta = respuesta && typeof aTelecom.rank === 'number';
                }
                if (aTelecom.system) {
                    respuesta = respuesta && typeof aTelecom.system === 'string' &&
                        aTelecom.system.match('phone|fax|email|pager|url|sms|other') != null;
                }
                if (aTelecom.use) {
                    respuesta = respuesta && typeof aTelecom.use === 'string';
                }
            });
        }
        if (pacienteFhir.gender) {
            respuesta = respuesta && pacienteFhir.gender.match('male|female|other|unknown') != null;
        }
        if (pacienteFhir.birthDate) {
            respuesta = respuesta && typeof pacienteFhir.birthDate === 'string'; // TODO: Algun control de que tenga formato Date
        }
        if (pacienteFhir.deceasedDateTime) {
            respuesta = respuesta && typeof pacienteFhir.deceasedDateTime === 'string'; // TODO: Algun control de que tenga formato DateTime
        }
        if (pacienteFhir.address) {
            pacienteFhir.address.forEach(anAddress => {
                respuesta = respuesta && Object.keys(anAddress).every(addressFields);
                if (anAddress.resourceType) {
                    respuesta = respuesta && anAddress.resourceType === 'Address';
                }
                if (anAddress.postalCode) {
                    respuesta = respuesta && typeof anAddress.postalCode === 'string';
                }
                if (anAddress.line) {
                    respuesta = respuesta && anAddress.line.every(areStrings);
                }
                if (anAddress.city) {
                    respuesta = respuesta && typeof anAddress.city === 'string';
                }
                if (anAddress.state) {
                    respuesta = respuesta && typeof anAddress.state === 'string';
                }
            });
        }
        if (pacienteFhir.maritalStatus && pacienteFhir.maritalStatus.text) {
            respuesta = respuesta && Object.keys(pacienteFhir.maritalStatus).every(codingFields)
                && typeof pacienteFhir.maritalStatus.text === 'string'
                && pacienteFhir.maritalStatus.text.match('Married|Divorced|Widowed|unmarried|unknown') != null;
        }
        if (pacienteFhir.photo) {
            pacienteFhir.photo.forEach(aPhoto => {
                respuesta = respuesta && Object.keys(aPhoto).every(photoFields);
                if (aPhoto.data) {
                    respuesta = respuesta && typeof aPhoto.data === 'string';
                }
            });
        }
        if (pacienteFhir.contact) {
            pacienteFhir.contact.forEach(aContact => {
                if (aContact.relationship) {
                    aContact.relationship.forEach(aRelation => {
                        respuesta = respuesta && Object.keys(aRelation).every(codingFields);
                    });
                }
                if (aContact.name) {
                    respuesta = respuesta && validName(aContact.name);
                }
            });
        }
    } else {
        respuesta = fieldVerified; // No cumple con los campos estandar de FHIR
    }
    return respuesta;
}
