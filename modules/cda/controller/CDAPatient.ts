import * as pacienteCtr from '../../../core/mpi/controller/paciente';
import * as mongoose from 'mongoose';
import { CDA } from './class/CDA';
import { Patient } from './class/Patient';
import { Organization } from './class/Organization';
import { Author } from './class/Author';
import { Body, Component, ImageComponent } from './class/Body';
import { CDABuilder } from './builder/CdaBuilder';

import * as base64_stream from 'base64-stream';
import { makeFs } from '../schemas/CDAFiles';
import * as Stream from 'stream';
import * as moment from 'moment';

import { CDA as CDAConfig } from '../../../config.private';
import { configuracionPrestacionModel } from './../../../core/term/schemas/configuracionPrestacion';
import { Auth } from '../../../auth/auth.class';

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
        if (Auth.check(req, 'cda:paciente')) {
            const realPac = await pacienteCtr.buscarPaciente(dataPaciente.id);
            if (realPac.paciente) {
                return realPac.paciente;
            }
        } else {
            const identificador = {
                entidad: String(organizacion),
                valor: dataPaciente.id
            };
            try {
                const query = await pacienteCtr.buscarPacienteWithcondition({
                    identificadores: identificador
                });
                if (query) {
                    return query.paciente;
                }
            } catch (e) {
                // nothing to do here
            }
        }
    }
    const pacientes = await pacienteCtr.matchPaciente(dataPaciente);
    if (pacientes.length > 0 && pacientes[0].value >= 0.95) {
        const realPac = await pacienteCtr.buscarPaciente(pacientes[0].paciente.id);
        const paciente = realPac.paciente;

        if (!paciente.identificadores) {
            paciente.identificadores = [];
        }
        const index = paciente.identificadores.findIndex(item => item.entidad === String(organizacion));
        if (index < 0) {
            paciente.identificadores.push({
                entidad: organizacion,
                valor: dataPaciente.id
            });
            await pacienteCtr.updatePaciente(paciente, {
                identificadores: paciente.identificadores
            }, req);
        }
        return paciente;
    } else {
        // No creamos más el paciente en MPI
        return await pacienteCtr.createPaciente(dataToPac(dataPaciente, organizacion), req);

    }
}

function dataToPac(dataPaciente, identificador) {
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

// Root id principal de ANDES
const rootOID = CDAConfig.rootOID;

/**
 * Match desde snomed a un código LOINC para indentificar el CDA
 * @param snomed ConceptId
 */

export async function matchCode(snomed) {
    let prestacion: any;
    if (!isNaN(snomed)) {
        prestacion = await configuracionPrestacionModel.findOne({
            'snomed.conceptId': snomed
        }, { snomed: 1, loinc: 1 });
        if (prestacion) {
            return prestacion;
        } else {
            return null;
        }
    } else {
        return null;
    }
}

/**
 * Match desde snomed a un código LOINC para indentificar el CDA
 * @param snomed ConceptId
 */

export async function matchCodeByLoinc(loinc) {
    const prestacion: any = await configuracionPrestacionModel.find({
        'loinc.code': loinc
    });
    if (prestacion.length > 0) {
        return prestacion[0];
    }
}

/**
 * Creamos la estructura ICode en base a un CIE10
 * @param cie10
 */
function icd10Code(cie10) {
    return {
        codeSystem: '2.16.840.1.113883.6.90',
        code: cie10.codigo,
        codeSystemName: 'ICD-10',
        displayName: cie10.nombre
    };
}

/**
 * Crea la estructura IID a partir de un ID
 * @param id
 */
function buildID(id, oid = rootOID) {
    return {
        root: oid,
        extension: id
    };
}

const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export function base64toStream(base64) {
    const match = base64.match(base64RegExp);
    const mime = match[1];
    const data = match[2];
    const extension = mime.split('/')[1];

    const streamInput = new Stream.PassThrough();
    const decoder = base64_stream.decode();

    streamInput.pipe(decoder);
    streamInput.end(data);
    return {
        mimeType: mime,
        extension,
        stream: decoder
    };
}

export function streamToString(stream): Promise<String> {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => {
            chunks.push(chunk.toString());
        });
        stream.on('end', () => {
            resolve(chunks.join(''));
        });
    });
}

/**
 * Guarda un archivo para ser almacenado en un CDA
 */

export function storeFile({
    extension,
    mimeType,
    stream,
    metadata,
    filename = null
}) {
    return new Promise((resolve, reject) => {
        const CDAFiles = makeFs();
        const uniqueId = String(new mongoose.Types.ObjectId());

        CDAFiles.write({
            _id: uniqueId,
            filename: filename ? filename : uniqueId + '.' + extension,
            contentType: mimeType,
            metadata
        },
            stream,
            (error, createdFile) => {
                if (error) {
                    return reject(error);
                }
                return resolve({
                    id: createdFile._id,
                    data: createdFile.filename,
                    mime: mimeType,
                    is64: false
                });
            }
        );
    });
}

/**
 * Solo PDF
 */

export function storePdfFile(pdf) {
    return new Promise((resolve, reject) => {
        const uniqueId = String(new mongoose.Types.ObjectId());
        const input = new Stream.PassThrough();
        const mime = 'application/pdf';
        const CDAFiles = makeFs();
        CDAFiles.write({
            _id: uniqueId,
            filename: uniqueId + '.pdf',
            contentType: mime
        },
            input.pipe(pdf),
            (error, createdFile) => {
                resolve({
                    id: createdFile._id,
                    data: 'files/' + createdFile.filename,
                    mime
                });
            }
        );
    });
}

/**
 * Almacena un XML en Mongo
 * @param objectID ID del CDA
 * @param cdaXml  XML en texto plano
 * @param metadata Datos extras para almacenar con el archivo.
 */
export function storeCDA(objectID, cdaXml, metadata) {
    return new Promise((resolve, reject) => {

        const input = new Stream.PassThrough();
        const CDAFiles = makeFs();

        CDAFiles.write({
            _id: objectID,
            filename: objectID + '.xml',
            contentType: 'application/xml',
            metadata
        },
            input,
            (error, createdFile) => {
                resolve(createdFile);
            }
        );

        input.end(cdaXml);
    });
}

/**
 * Genera el CDA
 * @param {string} uniqueId ID del CDA
 * @param {object} patient Datos del paciente. 5 datos básicos
 * @param {Date} date Fecha de la prestación
 * @param {object} author Dato del profesional. [nombre, apellido, (id)]
 * @param {object} organization Datos de la organización [id, nombre]
 * @param {conceptId} snomed concept id asociado. Sirve para tabular el tipo de CDA
 * @param {CIE10Schema} cie10 Código cie10
 * @param {string} text Texto descriptivo
 * @param {string} base64  Archivo para adjutar al CDA en base64
 */
export function generateCDA(uniqueId, confidentiality, patient, date, author, organization, prestacion, cie10, text, file) {

    const cda = new CDA();
    cda.id(buildID(uniqueId));

    // let code = await matchCode(snomed);
    const code = prestacion.loinc;
    cda.code(code);

    cda.type({
        codeSystem: '2.16.840.1.113883.6.96',
        code: prestacion.snomed.conceptId,
        codeSystemName: 'snomed-CT',
        displayName: prestacion.snomed.term
    });

    // [TODO] Desde donde inferir el titulo
    cda.title(code.displayName);

    if (confidentiality === 'R') {
        cda.confidentialityCode({
            codeSystem: '2.16.840.1.113883.5.25',
            code: 'R'
        });
    }

    cda.versionNumber(1);
    cda.date(date);

    const patientCDA = new Patient();
    patientCDA.setFirstname(patient.nombre).setLastname(patient.apellido);
    patientCDA.setBirthtime(patient.fechaNacimiento);
    patientCDA.setGender(patient.sexo);
    patientCDA.setDocumento(patient.documento);

    if (patient.id) {
        patientCDA.setId(buildID(patient.id));
    }
    cda.patient(patientCDA);
    // mover a config.private en algún momento
    let custodianCDA = new Organization();
    custodianCDA.id(buildID('59380153db8e90fe4602ec02'));
    custodianCDA.name('SUBSECRETARIA DE SALUD');
    cda.custodian(custodianCDA);

    let orgCDA = new Organization();
    orgCDA.id(buildID(organization._id));
    orgCDA.name(organization.nombre);

    if (author) {
        const authorCDA = new Author();
        authorCDA.firstname(author.nombre);
        authorCDA.lastname(author.apellido);
        authorCDA.documento(author.documento);
        authorCDA.matricula(author.matricula);
        authorCDA.organization(orgCDA);
        if (author._id) {
            authorCDA.id(buildID(author._id));
        }
        cda.author(authorCDA);
    }

    const body = new Body();

    const textComponent = new Component();
    if (text) {
        textComponent.text(text);
        if (cie10) {
            textComponent.code(icd10Code(cie10));
        }
    } else {
        textComponent.text('Sin datos');
        if (cie10) {
            textComponent.code(icd10Code(cie10));
        }
    }
    body.addComponent(textComponent);

    // [TODO] Archivo en base64 o aparte
    if (file) {

        // var match = base64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/);
        // var mime = match[1];
        // var data = match[2];

        const imagecomponent = new ImageComponent();
        imagecomponent.title('Archivo adjunto');
        imagecomponent.file(file.data);
        imagecomponent.type(file.mime);
        imagecomponent.isB64(file.is64 || false);

        body.addComponent(imagecomponent);
    }

    cda.body(body);

    const builder = new CDABuilder();
    return builder.build(cda);

}

/**
 * Listado de CDA por metadata
 * @param conds
 */
export function findByMetadata(conds) {
    const CDAFiles = makeFs();
    return CDAFiles.find(conds);
}

/**
 * Chequea si un CDA existe!
 * @param id
 * @param fecha
 * @param orgId
 */
export async function CDAExists(id, fecha, orgId) {
    const existe = await findByMetadata({
        'metadata.extras.id': id,
        'metadata.fecha': fecha,
        'metadata.extras.organizacion': mongoose.Types.ObjectId(orgId),
    });
    return existe.length > 0;
}


/**
 * listado de CDA por paciente y tipo de prestación
 */

export function searchByPatient(pacienteId, prestacion, {
    limit,
    skip
}): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
        const CDAFiles = makeFs();
        const conditions: any = {
            'metadata.paciente': mongoose.Types.ObjectId(pacienteId),
            'metadata.cdaId': { $exists: false }
        };
        if (prestacion) {
            conditions['metadata.prestacion.snomed.conceptId'] = prestacion;
        }
        if (limit === null) {
            limit = 100;
        }
        if (skip === null) {
            skip = 0;
        }
        try {
            let list = await CDAFiles.find(conditions).sort({
                'metadata.fecha': -1
            }).limit(limit).skip(skip);
            list = list.map(item => {
                const data = item.metadata;
                data.cda_id = item._id;
                if (data.adjuntos) {
                    data.adjuntos = data.adjuntos.map(item2 => item2.path).map(file => {
                        if (!file.startsWith('files/')) {
                            return data.cda_id + '/' + file;
                        }
                        return file;
                    });

                }

                return item.metadata;
            });

            return resolve(list);
        } catch (e) {
            return reject(e);
        }

    });
}

/**
 * Levante el XML a partir de un ID cd CDA
 */
export async function loadCDA(cdaID) {
    return new Promise(async (resolve, reject) => {
        const CDAFiles = makeFs();
        CDAFiles.readById(cdaID, (err, buffer) => {
            const xml = buffer.toString('utf8');
            return resolve(xml);
        });
    });
}

/**
 * Valida la ruta de cración de CDA.
 */

export function validateMiddleware(req, res, next) {
    const errors: any = {};
    const validString = (value) => {
        return value && value.length > 0;
    };
    const dataPaciente = req.body.paciente;
    const dataProfesional = req.body.profesional;
    const file = req.body.file;

    if (!moment(req.body.fecha).isValid()) {
        errors.fecha = 'invalid_format';
    }

    if (file && !base64RegExp.test(file)) {
        errors.file = 'file_error';
    }

    if (!validString(dataProfesional.nombre)) {
        errors.profesional = errors.profesional || {};
        errors.profesional.nombre = 'required';
    }

    if (!validString(dataProfesional.apellido)) {
        errors.profesional = errors.profesional || {};
        errors.profesional.apellido = 'required';
    }

    if (!validString(dataPaciente.nombre)) {
        errors.paciente = errors.paciente || {};
        errors.paciente.nombre = 'required';
    }

    if (!validString(dataPaciente.apellido)) {
        errors.paciente = errors.paciente || {};
        errors.paciente.apellido = 'required';
    }

    if (!validString(dataPaciente.documento)) {
        errors.paciente = errors.paciente || {};
        errors.paciente.documento = 'required';
    }

    if (!dataPaciente.fechaNacimiento || !moment(req.body.fecha).isValid()) {
        errors.paciente = errors.paciente || {};
        errors.paciente.fechaNacimiento = 'invalid_date';
    }

    if (!dataPaciente.sexo || ['masculino', 'femenino'].indexOf(dataPaciente.sexo) < 0) {
        errors.paciente = errors.paciente || {};
        errors.paciente.sexo = 'invalid_gender';
    }

    if (Object.keys(errors).length > 0) {
        return next(errors);
    }
    return next();
}

/**
 * Valida contra el archivo de esquemas de CDA CDA.xsd
 */

export function validateSchemaCDA(xmlRaw) {
    const libxmljs = require('libxmljs');
    let schemaXML = null;
    function loadSchema() {
        return new Promise((resolve, reject) => {
            if (schemaXML) {
                return resolve(schemaXML);
            }

            const path = require('path');
            const fs = require('fs');

            const filePath = path.join(__dirname, './schema/CDA.xsd');
            fs.readFile(filePath, {
                encoding: 'utf8'
            }, (err, xsd) => {
                if (err) {
                    return reject(err);
                }
                schemaXML = libxmljs.parseXml(xsd, {
                    baseUrl: path.join(__dirname, 'schema') + '/'
                });

                return resolve(schemaXML);

            });
        });
    }

    return loadSchema().then(xsdDoc => {
        const xmlDoc = libxmljs.parseXml(xmlRaw);
        xmlDoc.validate(xsdDoc);

        if (xmlDoc.validationErrors.length) {
            return Promise.reject(xmlDoc.validationErrors);
        }
        return Promise.resolve(xmlDoc);
    });

}

/**
 * Valida ciertos parametros del CDA y extrae otros
 */

export function checkAndExtract(xmlDom) {
    function nestedObject(data, keys, value) {
        const key = keys[0];
        if (keys.length > 1) {
            if (!data[key]) {
                data[key] = {};
            }
            nestedObject(data[key], keys.slice(1), value);
        } else {
            data[key] = value;
        }

    }

    function checkArg(root, params) {
        let passed = true;
        const data = {};
        for (const param of params) {

            let text = '';
            if (param.many) {
                const items = root.find(param.key, {
                    x: 'urn:hl7-org:v3'
                });
                for (const i of items) {
                    text += i.text ? i.text() : i.value();
                    text += ' ';
                }
                text.trim();
            } else {
                const item = root.get(param.key, {
                    x: 'urn:hl7-org:v3'
                });
                if (item) {
                    text = item.text ? item.text() : item.value();
                }
            }

            if (param.match) {
                passed = passed && text === param.match;

            }

            passed = passed && (!param.require || text.length > 0);

            if (param.as) {
                nestedObject(data, param.as.split('.'), text);
            }
        }
        return passed ? data : null;
    }
    const _root = xmlDom.root();
    const _params = [
        {
            key: '//x:ClinicalDocument/x:id/@root',
            match: CDAConfig.rootOID
        },
        {
            key: '//x:ClinicalDocument/x:id/@extension',
            as: 'id'
        },
        {
            key: '//x:ClinicalDocument/x:typeId/@root',
            match: '2.16.840.1.113883.1.3'
        },
        {
            key: '//x:ClinicalDocument/x:typeId/@extension',
            match: 'POCD_HD000040'
        },
        {
            key: '//x:ClinicalDocument/x:code/@code',
            as: 'loinc',
            require: true
        },
        {
            key: '//x:ClinicalDocument/x:effectiveTime/@value',
            as: 'fecha',
            require: true
        },

        {
            key: `//x:ClinicalDocument/x:recordTarget/x:patientRole/x:id[@root='${CDAConfig.dniOID}']/@extension`,
            as: 'paciente.documento',
            require: true
        },
        {
            key: `//x:ClinicalDocument/x:recordTarget/x:patientRole/x:patient/x:name/x:given`,
            many: true,
            as: 'paciente.nombre',
            require: true
        },
        {
            key: `//x:ClinicalDocument/x:recordTarget/x:patientRole/x:patient/x:name/x:family`,
            many: true,
            as: 'paciente.apellido',
            require: true
        },
        {
            key: `//x:ClinicalDocument/x:recordTarget/x:patientRole/x:patient/x:administrativeGenderCode/@code`,
            as: 'paciente.sexo',
            require: true
        },
        {
            key: `//x:ClinicalDocument/x:recordTarget/x:patientRole/x:patient/x:birthTime/@value`,
            as: 'paciente.fechaNacimiento',
            require: true
        },

        {
            key: `//x:ClinicalDocument/x:custodian/x:assignedCustodian/x:representedCustodianOrganization/x:id/@root`,
            match: CDAConfig.rootOID
        },
        {
            key: `//x:ClinicalDocument/x:documentationOf/x:serviceEvent/x:code/@code`,
            as: 'prestacion',
            require: true
        },

        {
            key: `//x:ClinicalDocument/x:author/x:assignedAuthor/x:representedOrganization/x:id/@extension`,
            as: 'organizacion.id',
            require: true
        },
        {
            key: `//x:ClinicalDocument/x:author/x:assignedAuthor/x:representedOrganization/x:name`,
            as: 'organizacion.name',
            require: true
        },

        {
            key: `//x:ClinicalDocument/x:author/x:assignedAuthor/x:id[@root='${CDAConfig.dniOID}']/@extension`,
            as: 'profesional.documento',
            require: true
        },
        {
            key: `//x:ClinicalDocument/x:author/x:assignedAuthor/x:assignedPerson/x:name/x:given`,
            many: true,
            as: 'profesional.nombre',
            require: true
        },
        {
            key: `//x:ClinicalDocument/x:author/x:assignedAuthor/x:assignedPerson/x:name/x:family`,
            many: true,
            as: 'profesional.apellido'
        },

        {
            key: `//x:ClinicalDocument/x:component/x:structuredBody/x:component/x:section/x:entry/x:observationMedia/x:value/x:reference/@value`,
            as: 'adjunto'
        },


    ];
    const metadata: any = checkArg(_root, _params);
    if (metadata.adjunto && metadata.adjunto.indexOf('/') >= 0) {
        return null;
    }

    return metadata;
}
