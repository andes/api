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
import {
    PacienteFHIR
} from '../../interfaces/IPacienteFHIR';

export function pacientesAFHIR(ids: any[]) {
    return new Promise((resolve: any, reject: any) => {
        let pacientesFHIR = [];
        let promises = [];

        ids.forEach(function (id) {
            promises.push(
                pacienteMpi.findById(id)
                    .then((data: any) => {
                        if (data) {
                            let identificadores = data.documento ? [{ assigner: 'DU', value: data.documento }] : [];
                            // Parsea contactos
                            let contactos = data.contacto ? data.contacto.map(unContacto => {
                                let cont = {
                                    resourceType: 'ContactPoint',
                                    value: unContacto.valor,
                                    rank: unContacto.ranking,
                                };
                                switch (unContacto.tipo) {
                                    case 'fijo':
                                        {
                                            cont['system'] = 'phone';
                                        }
                                        break;
                                    case 'celular':
                                        {
                                            cont['system'] = 'phone';
                                        }
                                        break;
                                    case 'email':
                                        {
                                            cont['system'] = 'email';
                                        }
                                        break;
                                }
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
                                resourceType: 'Patient',
                                identifier: identificadores,
                                active: data.activo, // Whether this patient's record is in active use
                                name: [{
                                    resourceType: 'HumanName',
                                    family: data.apellido, // Family name (often called 'Surname')
                                    given: data.nombre.split(' '), // Given names (not always 'first'). Includes middle names
                                }],
                                gender: genero, // male | female | other | unknown
                                birthDate: data.fechaNacimiento,
                                deceasedDateTime: data.fechaFallecimiento
                            };
                            if (data.estadoCivil) {
                                pacienteFHIR['maritalStatus'] = { text: data.estadoCivil };
                            }
                            if (data.foto) { // Image of the patient
                                pacienteFHIR['photo'] = [{ data: data.foto }];
                            }
                            if (contactos.length > 0) { // A contact detail for the individual 
                                pacienteFHIR['telecom'] = contactos;
                            }
                            if (direcciones.length > 0) { // Addresses for the individual
                                pacienteFHIR['address'] = direcciones;
                            }
                            if (relaciones.length > 0) {  // A contact party (e.g. guardian, partner, friend) for the patient
                                pacienteFHIR['contact'] = relaciones;
                            }
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


export function FHIRAPaciente(paciente: PacienteFHIR) {
    return new Promise((resolve: any, reject: any) => {
        let arrayPrmesas = [];
    let contactos = paciente.telecom ? paciente.telecom.map(unContacto => {
        let cont = {
            valor: unContacto.value,
            ranking: unContacto.rank
        };
        switch (unContacto.system) {
            case 'phone':
                {
                    cont['tipo'] = 'celular';
                }
                break;
            case 'email':
                {
                    cont['tipo'] = 'email';
                }
                break;
        }
        return cont;
    }) : [];
    // let direcciones = paciente.direcciones ? data.direcciones.map(unaDireccion => {

    //     let direc = {
    //         resourceType: 'Address',
    //         postalCode: unaDireccion.codigoPostal,
    //         line: [unaDireccion.valor],
    //         city: unaDireccion.ubicacion.localidad,
    //         state: unaDireccion.ubicacion.provincia,
    //         country: unaDireccion.ubicacion.pais,
    //     };
    //     return direc;
    // }) : [];
    let pacienteMPI = {
        documento: paciente.identifier[0].value,
        activo: paciente.active,
        nombre: paciente.name[0].given.join().replace(',', ' '),
        apellido: paciente.name[0].family,
        fechaNacimiento: paciente.birthDate
    }
    if (paciente.active) {
        pacienteMPI['activo'] = paciente.active;
    }
    if (contactos.length > 0) {
        pacienteMPI['contacto'] = contactos;
    }
    resolve(pacienteMPI);
});
}
