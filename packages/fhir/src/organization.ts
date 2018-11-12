/**
 * Encode a organization from ANDES to FHIR
 * @param {} organization
 */
export function encode(organization) {
    let data = organization;
    if (data) {
        let identificadores = data.codigo.sisa ? [{
            assigner: 'sisa',
            value: data.codigo.sisa
        }] : [];
        if (data.codigo.cuie) {
            identificadores.push({
                assigner: 'cuie',
                value: data.codigo.cuie
            });
        }
        if (data.codigo.remediar) {
            identificadores.push({
                assigner: 'remediar',
                value: data.codigo.remediar
            });
        }
        if (data.codigo.sips) {
            identificadores.push({
                assigner: 'sips',
                value: data.codigo.sips
            });
        }
        identificadores.push({
            assigner: 'andes',
            value: data._id
        });

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
        let direcciones = data.direccion ? {
            resourceType: 'Address',
            postalCode: data.direccion.codigoPostal ? data.direccion.codigoPostal : '',
            line: [data.direccion.valor],
            city: data.direccion.ubicacion.localidad ? data.direccion.ubicacion.localidad.nombre : '',
            state: data.direccion.ubicacion.provincia ? data.direccion.ubicacion.provincia.nombre : '',
            country: data.direccion.ubicacion.pais ? data.direccion.ubicacion.pais.nombre : '',
        } : [];

        // Armamos la organizacion FHIR
        let organizacionFHIR = {
            resourceType: 'Organization',
            identifier: identificadores,
            active: data.activo ? data.activo : null,
            type: [{
                resourceType: 'CodeableConcept',
                text: data.tipoEstablecimiento ? data.tipoEstablecimiento.nombre : null,
            }],
            name: data.nombre ? data.nombre : null, // Name used for the organization
        };
        if (contactos.length > 0) { // A contact detail for the organization
            organizacionFHIR['telecom'] = contactos;
        }

        if (direcciones) { // 	An address for the organization
            organizacionFHIR['address'] = direcciones;
        }
        return organizacionFHIR;
    } else {
        return null;
    }
}
