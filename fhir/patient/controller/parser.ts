import {
    paciente
} from './../../../core/mpi/schemas/paciente';
import {
    log
} from './../../../core/log/schemas/log';
// Schemas
import {
    pacienteMpi
} from '../../../core/mpi/schemas/paciente';

export function pacientesAFHIR(ids: any[]) {
    return new Promise((resolve: any, reject: any) => {
        let pacientesFHIR = [];
        let promises = [];

        ids.forEach(function (id) {
            promises.push(
                pacienteMpi.findById(id)
                .then((data: any) => {
                    if (data) {
                        /* Armar el recurso FHIR */
                        let identificadores = data.documento ? [{assigner:'DU', value: data.documento}] : [];

                        // Parsea contactos
                        let contactos = data.contacto ? data.contacto.map(unContacto => {
                            let cont = {
                                resourceType: 'ContactPoint',
                                system: unContacto.tipo,
                                value: unContacto.valor,
                                rank: unContacto.ranking,
                                // period ??
                            };
                            return cont;
                        }) : [];

                        // Parsea direcciones
                        let direcciones = data.direcciones ? data.direcciones.map(unaDireccion => {
                            let direc = {
                                resourceType: 'Address',
                                postalCode: unaDireccion.codigoPostal,
                                line: [unaDireccion.valor],
                                city: unaDireccion.ubicacion.localidad,
                                state: unaDireccion.ubicacion.provincia,
                                country: unaDireccion.ubicacion.pais,
                            };
                            return direc;
                        }) : [];

                        // Parsea relaciones
                        let relaciones = data.relaciones ? data.relaciones.map(unaRelacion => {
                            let relacion = {
                                'relationship': [{
                                    text: unaRelacion.relacion.nombre
                                }], // The kind of relationship
                                'name': {
                                    'resourceType': 'HumanName',
                                    'family': unaRelacion.apellido, // Family name (often called 'Surname')
                                    'given': [unaRelacion.nombre], // Given names (not always 'first'). Includes middle names
                                }
                            };
                            return relacion;
                        }) : [];

                        // enum: ['femenino', 'masculino', 'otro']
                        let genero;
                        switch (data.genero) {
                            case 'femenino':
                                {
                                    genero = 'female';
                                }
                                break;
                            case 'masculino':
                                {
                                    genero = 'male';
                                }
                                break;
                            case 'otro':
                                {
                                    genero = 'other';
                                }
                                break;
                        }

                        let pacienteFHIR = {
                            'resourceType': 'Patient',
                            'identifier': identificadores,
                            'active': data.activo, // Whether this patient's record is in active use
                            'name': [{
                                'resourceType': 'HumanName',
                                'family': data.apellido, // Family name (often called 'Surname')
                                'given': data.nombre.split(' '), // Given names (not always 'first'). Includes middle names
                            }],
                            'telecom': contactos,
                            'gender': genero, // male | female | other | unknown
                            'birthDate': data.fechaNacimiento,
                            'deceasedDateTime': data.fechaFallecimiento,
                            'address': direcciones, // Addresses for the individual
                            'maritalStatus': {
                                text: data.estadoCivil
                            }, // Marital (civil) status of a patient
                            'photo': [{
                                data: data.foto
                            }], // Image of the patient
                            'contact': relaciones
                        };
                        pacientesFHIR.push(pacienteFHIR);
                    }

                })
                .catch((error) => {
                    reject(error);
                })
            );
        });

        Promise.all(promises).then(() => {
            resolve(pacientesFHIR);
        });


    });
}
