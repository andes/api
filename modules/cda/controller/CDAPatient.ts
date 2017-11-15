import * as pacienteCtr from '../../../core/mpi/controller/paciente';
import * as mongoose from 'mongoose';
import { CDA } from './class/CDA';
import { Patient } from './class/Patient';
import { Organization } from './class/Organization';
import { Doctor } from './class/Doctor';
import { Body, Component, ImageComponent } from './class/Body';
import { CDABuilder } from './builder/CdaBuilder';

import { makeFs } from '../schemas/CDAFiles';
import * as stream from 'stream';
/**
 * Crea un objeto paciente desde los datos
 */
function dataToPac (dataPaciente, identificador) {
    return {
        apellido: dataPaciente.apellido,
        nombre: dataPaciente.nombre,
        fechaNacimiento: dataPaciente.fechaNacimiento,
        documento: dataPaciente.documento,
        sexo: dataPaciente.sexo,
        genero: dataPaciente.sexo,
        activo: true,
        estado: 'temporal',
        identificadores: [{
            entidad: identificador,
            valor: dataPaciente.id
        }]
    };
}

/**
 * Matcheamos los datos del paciente.
 * Primero buscamos si el ID en la organización ya esta cargado.
 * Hacemos un multimatch con los datos del paciente y matcheamos los datos.
 * Seleccionamos si hay alguno arriba de 95%
 * Sino creamos un nuevo paciente
 * Cargamos el identificador de la organización de origen.
 *
 * @param {Request} req
 * @param {object} dataPaciente Datos del paciente
 * @param {string} organizacion Identificador de la organización
 */
export async function findOrCreate(req, dataPaciente, organizacion) {
    if (dataPaciente.id) {

        let identificador = {
            entidad: String(organizacion),
            valor: dataPaciente.id
        };

        try {

            let query = await pacienteCtr.buscarPacienteWithcondition({
                identificadores: identificador
            });

            if (query) {
                return query.paciente;
            }

        } catch (e) {
            // nothing to do here
        }
    }

    let pacientes = await pacienteCtr.matchPaciente(dataPaciente);
    if (pacientes.length > 0 && pacientes[0].value >= 0.95) {
        let realPac = await pacienteCtr.buscarPaciente(pacientes[0].paciente.id);
        let paciente = realPac.paciente;

        if (!paciente.identificadores) {
            paciente.identificadores = [];
        }
        let index = paciente.identificadores.findIndex(item => item.entidad === String(organizacion));
        if (index < 0) {
            paciente.identificadores.push({
                entidad: organizacion,
                valor: dataPaciente.id
            });
            await pacienteCtr.updatePaciente(paciente, {identificadores: paciente.identificadores} , req);
        }
        return paciente;
    } else {
        return await pacienteCtr.createPaciente(dataToPac(dataPaciente, organizacion), req);
    }
}

// Decidir este rootOID
let rootOID = '2.16.840.1.113883.2.10.17.99999';


function matchCode(snomed) {
    switch (snomed) {
        default:
            return {
                code: '47039-3',
                codeSystem: '2.16.840.1.113883.6.1',
                codeSystemName: 'LOINC',
                displayName: 'Admission history and physical note'
            };
    }
}

function icd10Code (cie10) {
    return {
        codeSystem: '2.16.840.1.113883.6.90',
        code: cie10,
        codeSystemName: 'ICD-10',
        displayName: 'Falta buscar el nombre del codigo cie10'
    };
}

function buildID (id) {
    return {
        root: rootOID,
        extension: id
    };
}


export function storeCDA (objectID, cdaXml, metadata) {
    return new Promise((resolve, reject) => {

        let input = new stream.PassThrough();
        let CDAFiles = makeFs();

        CDAFiles.write({
                _id: objectID,
                filename:  objectID + '.xml',
                contentType: 'application/xml',
                metadata
            },
            input,
            function(error, createdFile){
                resolve(createdFile);
            }
        );

        input.end(cdaXml);
    });
}

export function generateCDA(uniqueId, patient, date, author, organization, snomed, cie10, text, base64) {
    let cda = new CDA();
    // let uniqueId = String(new mongoose.Types.ObjectId());

    cda.setId(buildID(uniqueId));

    let code = matchCode(snomed);
    cda.setCode(code);
    cda.setVersionNumber(1);
    cda.setTitle(code.displayName);
    cda.setEffectiveTime(date);

    let patientCDA = new Patient();
    patientCDA.setFirstname(patient.nombre).setLastname(patient.apellido);
    patientCDA.setBirthtime(patient.fechaNacimiento);
    patientCDA.setGender(patient.sexo);
    if (patient._id) {
        patientCDA.setId(buildID(patient._id));
    }
    cda.setPatient(patientCDA);


    let orgCDA = new Organization();
    orgCDA.setId(buildID(organization._id)).setName(organization.nombre);

    cda.setCustodian(orgCDA);

    let authorCDA = new Doctor();
    authorCDA.setFirstname(author.nombre).setLastname(author.apellido);
    authorCDA.setOrganization(orgCDA);
    if (author._id) {
        authorCDA.setId(buildID(author._id));
    }
    cda.setAuthor(authorCDA);

    let body = new Body();

    if (text) {
        let textComponent = new Component();
        textComponent.text(text);
        if (cie10) {
            textComponent.code(icd10Code(cie10));
        }
        body.addComponent(textComponent);
    }

    if (base64) {
        var match = base64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/);
        var mime = match[1];
        var data = match[2];

        let imagecomponent = new ImageComponent();
        imagecomponent.file(data);
        imagecomponent.type(mime);

        body.addComponent(imagecomponent);
    }

    cda.body(body);

    let builder = new CDABuilder();
    return builder.build(cda);

}
