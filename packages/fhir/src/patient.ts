
/**
 * Encode a patient from ANDES to FHIR
 * @param {} patient
 */
export function encode(patient) {
    let data = patient;
    if (data) {
        let identificadores = data.documento ? [{
            assigner: 'DU',
            value: data.documento
        }] : [];
        if (data.cuil) {
            identificadores.push({
                assigner: 'CUIL',
                value: data.cuil
            });
        }
        identificadores.push({
            assigner: 'andes',
            value: data._id
        });
        // Parsea contactos
        let contactos = data.contacto ? data.contacto.map(unContacto => {
            let cont = {
                resourceType: 'ContactPoint',
                value: unContacto.valor,
                rank: unContacto.ranking,
            };
            switch (unContacto.tipo) {
                case 'fijo':
                    cont['system'] = 'phone';
                    break;
                case 'celular':
                    cont['system'] = 'phone';
                    break;
                case 'email':
                    cont['system'] = 'email';
                    break;
            }
            return cont;
        }) : [];
        // Parsea direcciones
        let direcciones = data.direccion ? data.direccion.map(unaDireccion => {
            let direc = {
                resourceType: 'Address',
                postalCode: unaDireccion.codigoPostal ? unaDireccion.codigoPostal : '',
                line: [unaDireccion.valor],
                city: unaDireccion.ubicacion.localidad ? unaDireccion.ubicacion.localidad.nombre : '',
                state: unaDireccion.ubicacion.provincia ? unaDireccion.ubicacion.provincia.nombre : '',
                country: unaDireccion.ubicacion.pais ? unaDireccion.ubicacion.pais.nombre : '',
            };
            return direc;
        }) : [];
        // Parsea relaciones
        let relaciones = data.relaciones ? data.relaciones.map(unaRelacion => {
            let relacion = {
                relationship: [{
                    text: unaRelacion.relacion.nombre
                }], // The kind of relationship
                name: {
                    resourceType: 'HumanName',
                    family: unaRelacion.apellido, // Family name (often called 'Surname')
                    given: [unaRelacion.nombre], // Given names (not always 'first'). Includes middle names
                }
            };
            return relacion;
        }) : [];
        let genero;
        switch (data.genero) {
            case 'femenino':
                genero = 'female';
                break;
            case 'masculino':
                genero = 'male';
                break;
            case 'otro':
                genero = 'other';
                break;
        }
        let pacienteFHIR = {
            resourceType: 'Patient',
            identifier: identificadores,
            active: data.activo ? data.activo : null, // Whether this patient's record is in active use
            name: [{
                resourceType: 'HumanName',
                family: data.apellido, // Family name (often called 'Surname')
                given: data.nombre, // Given names (not always 'first'). Includes middle names
            }],
            gender: genero, // male | female | other | unknown
            birthDate: data.fechaNacimiento,
            deceasedDateTime: data.fechaFallecimiento ? data.fechaFallecimiento : null,
        };
        if (data.estadoCivil) {
            let estadoCivil;
            switch (data.estadoCivil) {
                case 'casado':
                    estadoCivil = 'Married';
                    break;
                case 'divorciado':
                    estadoCivil = 'Divorced';
                    break;
                case 'viudo':
                    estadoCivil = 'Widowed';
                    break;
                case 'soltero':
                    estadoCivil = 'unmarried';
                    break;
                default:
                    estadoCivil = 'unknown';
                    break;
            }
            pacienteFHIR['maritalStatus'] = {
                text: estadoCivil
            };
        }
        if (data.foto) { // Image of the patient
            pacienteFHIR['photo'] = [{
                data: data.foto
            }];
        }
        if (contactos.length > 0) { // A contact detail for the individual
            pacienteFHIR['telecom'] = contactos;
        }
        if (direcciones.length > 0) { // Addresses for the individual
            pacienteFHIR['address'] = direcciones;
        }
        if (relaciones.length > 0) { // A contact party (e.g. guardian, partner, friend) for the patient
            pacienteFHIR['contact'] = relaciones;
        }
        return pacienteFHIR;
    } else {
        return null;
    }
}

/**
 * Decode a patient from FHIR to ANDES
 * @param {} patient
 */
export function decode(patient) {
    let genero;
    let sexo;
    // Cuando el paciente viene por FHIR suponemos el valor del genero tanto para nuestro field genero como sexo
    switch (patient.gender) {
        case 'female':
            genero = 'femenino';
            sexo = 'femenino';
            break;
        case 'male':
            genero = 'masculino';
            sexo = 'masculino';
            break;
        case 'other':
            genero = 'otro';
            sexo = 'otro';
            break;
    }

    let pacienteAndes = {
        documento: patient.identifier[0].value, // suponemos que como identificador en la primer posición nos envían el dni (Consensuar)
        nombre: patient.name[0].given.join().replace(',', ' '),
        apellido: patient.name[0].family.join().replace(',', ' '),
        fechaNacimiento: patient.birthDate,
        genero,
        sexo,
        estado: 'temporal' // Todos los pacientes que recibimos por Fhir son considerados temporales en su conversión.
    };
    let contactos = patient.telecom ? patient.telecom.map(unContacto => {
        let cont = {
            valor: unContacto.value,
            ranking: unContacto.rank
        };
        switch (unContacto.system) {
            case 'phone':
                cont['tipo'] = 'celular';
                break;
            case 'email':
                cont['tipo'] = 'email';
                break;
        }
        return cont;
    }) : [];

    let relaciones = patient.contact ? patient.contact.map(aContact => {
        let relacion = {
            relacion: {
                nombre: aContact.relationship[0].text
            },
            nombre: aContact.name.given.join().replace(',', ' '),
            apellido: aContact.name.family
        };
        return relacion;
    }) : [];

    if (patient.maritalStatus) {
        let estadoCivil;
        switch (patient.maritalStatus['text']) {
            case 'Married':
                estadoCivil = 'casado';
                break;
            case 'Divorced':
                estadoCivil = 'divorciado';
                break;
            case 'Widowed':
                estadoCivil = 'viudo';
                break;
            case 'unmarried':
                estadoCivil = 'soltero';
                break;
            default:
                estadoCivil = 'otro';
                break;
        }
        pacienteAndes['estadoCivil'] = estadoCivil;
    }

    let direcciones = patient.address ? patient.address.map(unaDireccion => {
        let dir = {
            activo: true,
            valor: unaDireccion.line,
            codigoPostal: unaDireccion.postalCode,
            // TODO: En un MATETIME ver si la información de pais, provincia, localidad
            // se delega en el insert o update. Y este decoder sólo guarda la info tal cual viene.
            ubicacion: {
                pais: unaDireccion.country,
                provincia: unaDireccion.state,
                localidad: unaDireccion.city
            }
        };
        return dir;
    }) : [];

    pacienteAndes['direccion'] = direcciones;

    if (patient.active) {
        pacienteAndes['activo'] = patient.active;
    }
    if (contactos.length > 0) {
        pacienteAndes['contacto'] = contactos;
    }
    if (patient.photo) { // Image of the patient
        pacienteAndes['foto'] = patient.photo[0].data;
    }

    if (patient.contact) {
        pacienteAndes['relaciones'] = relaciones;
    }

    return pacienteAndes;
}
/**
 * Verify if a patient has a FHIR format
 * @param {*} patient
 */
export function verify(patient) {
    let respuesta = true;
    let fieldVerified = Object.keys(patient).every(pacienteFHIRFields);
    // Verificamos que las key esten contenidas en los conjuntos mínimos pacienteFHIRField
    if (fieldVerified) {
        respuesta = ('resourceType' in patient) && patient.resourceType === 'Patient';
        respuesta = respuesta && ('identifier' in patient);
        if (patient.identifier.length > 0) {
            patient.identifier.forEach(anIdentifier => {
                respuesta = respuesta && Object.keys(anIdentifier).every(identifierFields);
                if (anIdentifier.assigner) {
                    respuesta = respuesta && typeof anIdentifier.assigner === 'string';
                }
                if (anIdentifier.value) {
                    respuesta = respuesta && typeof anIdentifier.value === 'string';
                }
            });

        }
        patient.name.forEach(aName => {
            respuesta = respuesta && validName(aName);
        });
        if (patient.active) {
            respuesta = respuesta && (typeof patient.active === 'boolean');
        }
        if (patient.telecom) {
            patient.telecom.forEach(aTelecom => {
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
        if (patient.gender) {
            respuesta = respuesta && patient.gender.match('male|female|other|unknown') != null;
        }
        if (patient.birthDate) {
            respuesta = respuesta && typeof patient.birthDate === 'string'; // TODO: Algun control de que tenga formato Date
        }
        if (patient.deceasedDateTime) {
            respuesta = respuesta && typeof patient.deceasedDateTime === 'string'; // TODO: Algun control de que tenga formato DateTime
        }
        if (patient.address) {
            patient.address.forEach(anAddress => {
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
        if (patient.maritalStatus && patient.maritalStatus.text) {
            respuesta = respuesta && Object.keys(patient.maritalStatus).every(codingFields)
                && typeof patient.maritalStatus.text === 'string'
                && patient.maritalStatus.text.match('Married|Divorced|Widowed|unmarried|unknown') != null;
        }
        if (patient.photo) {
            patient.photo.forEach(aPhoto => {
                respuesta = respuesta && Object.keys(aPhoto).every(photoFields);
                if (aPhoto.data) {
                    respuesta = respuesta && typeof aPhoto.data === 'string';
                }
            });
        }
        if (patient.contact) {
            patient.contact.forEach(aContact => {
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

function pacienteFHIRFields(elem) {
    return elem.match('resourceType|identifier|active|name|telecom|gender|birthDate|deceasedBoolean|deceasedDateTime|address|maritalStatus|photo|contact') != null;
}

function identifierFields(elem) {
    return elem.match('use|type|system|value|period|assigner') != null;
}

function nameFields(elem) {
    return elem.match('resourceType|family|given') != null;
}

function telecomFields(elem) {
    return elem.match('resourceType|system|value|use|rank|period') != null;
}

function addressFields(elem) {
    return elem.match('resourceType|use|type|text|line|city|district|state|postalCode|country|period') != null;
}

function codingFields(elem) {
    return elem.match('coding|text') != null;
}

function photoFields(elem) {
    return elem.match('contentType|language|data|url|size|hash|title|creation') != null;
}

function contactFields(elem) {
    return elem.match('relationship|name|telecom|address|gender|organization|period') != null;
}

function validName(aName) {
    return Object.keys(aName).every(nameFields) && ('resourceType' in aName) && aName.resourceType === 'HumanName' &&
        ('family' in aName) && Array.isArray(aName.family) && aName.family.every(areStrings) &&
        ('given' in aName) && Array.isArray(aName.given) && aName.given.every(areStrings);
}

function areStrings(elem) {
    return typeof elem === 'string';
}

