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
import * as controller from '../../../core/mpi/controller/paciente';
import * as localidad from '../../../core/tm/schemas/localidad';


export function pacientesAFHIR(ids: any[]) {
    return new Promise((resolve: any, reject: any) => {
        let pacientesFHIR = [];
        let promises = [];

        ids.forEach(function (id) {
            promises.push(
                controller.buscarPaciente(id)
                    .then((data: any) => {
                        if (data) {
                            let identificadores = data.documento ? [{ assigner: 'DU', value: data.documento }] : [];
                            identificadores.push({assigner: 'andes', value: id });
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
                                pacienteFHIR['maritalStatus'] = { text: estadoCivil };
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

function buscarLocalidad(localidadStr) {
    return new Promise((resolve, reject) => {

        let query = localidad.find({});
        query.where('nombre').equals(localidadStr);

        query.exec((err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}

function castearDirecciones(direcciones) {
    let resultado = [];
    return new Promise(function (resolve, reject) {
        direcciones.forEach(async function (unaAddress) {
            let direc = {
                codigoPostal: unaAddress.postalCode,
                valor: unaAddress.line[0]
            };
            if (unaAddress.city) {
                let localidadEncontrada = await buscarLocalidad(unaAddress.city);
                direc['ubicacion'] = {
                    localidad: {
                        _id: localidadEncontrada[0]._id,
                        nombre: localidadEncontrada[0].nombre
                    },
                    provincia: {
                        _id: localidadEncontrada[0].provincia._id,
                        nombre: localidadEncontrada[0].provincia.nombre
                    }
                };
            }
            resultado.push(direc);
        });
        resolve(resultado);
    });
}


export function FHIRAPaciente(pacienteFhir: PacienteFHIR) {
    return new Promise((resolve, reject) => {
        let genero;
        let sexo; // TODO: revisar, en fhir esta solo gender
        switch (pacienteFhir.gender) {
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
        let pacienteMPI = {
            documento: pacienteFhir.identifier[0].value,
            nombre: pacienteFhir.name[0].given.join().replace(',', ' '),
            apellido: pacienteFhir.name[0].family.join().replace(',', ' '),
            fechaNacimiento: pacienteFhir.birthDate,
            genero: genero,
            sexo: sexo,
            estado: 'temporal'
        };
        let contactos = pacienteFhir.telecom ? pacienteFhir.telecom.map(unContacto => {
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


        let relaciones = pacienteFhir.contact ? pacienteFhir.contact.map(aContact => {
            let relacion = {
                relacion : { nombre: aContact.relationship[0].text},
                nombre: aContact.name.given.join().replace(',', ' '),
                apellido: aContact.name.family
            };
            return relacion;
        }) : [];

        castearDirecciones(pacienteFhir.address).then((direcciones) => {
            pacienteMPI['direccion'] = direcciones;
        });

        if (pacienteFhir.maritalStatus) {
            let estadoCivil;
            switch (pacienteFhir.maritalStatus['text']) {
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
            pacienteMPI['estadoCivil'] = estadoCivil;
        }
        if (pacienteFhir.active) {
            pacienteMPI['activo'] = pacienteFhir.active;
        }
        if (contactos.length > 0) {
            pacienteMPI['contacto'] = contactos;
        }
        if (pacienteFhir.photo) { // Image of the patient
            pacienteMPI['foto'] = pacienteFhir.photo[0].data;
        }

        if (pacienteFhir.contact) {
            pacienteMPI['relaciones'] = relaciones;
        }
        resolve(pacienteMPI);
    });
}
