/**
 * Encode a practitioner from ANDES to FHIR
 * @param {} practitioner
 */
export function encode(practitioner) {
    let data = practitioner;
    if (data) {
        let identificadores = data.documento ? [{
            system: 'DU',
            value: data.documento
        }] : [];
        if (data.cuil) {
            identificadores.push({
                system: 'CUIL',
                value: data.cuil
            });
        }
        identificadores.push({
            system: 'andes',
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
        let profesionalFHIR = {
            resourceType: 'Practitioner',
            identifier: identificadores,
            active: data.activo ? data.activo : null, // Whether this practitioner's record is in active use
            name: [{
                resourceType: 'HumanName',
                family: data.apellido, // Family name (often called 'Surname')
                given: data.nombre, // Given names (not always 'first'). Includes middle names
            }],
            gender: genero, // male | female | other | unknown
            birthDate: data.fechaNacimiento,
        };
        if (data.foto) { // Image of the patient
            profesionalFHIR['photo'] = [{
                data: data.foto
            }];
        }
        if (contactos.length > 0) { // A contact detail for the individual
            profesionalFHIR['telecom'] = contactos;
        }
        if (direcciones.length > 0) { // Addresses for the individual
            profesionalFHIR['address'] = direcciones;
        }
        return profesionalFHIR;
    } else {
        return null;
    }
}
