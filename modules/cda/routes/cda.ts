import * as express from 'express';
import { model as Organizaciones } from '../../../core/tm/schemas/organizacion';
import { model as Cie10 } from '../../../core/term/schemas/cie10';
import { makeFs } from '../schemas/CDAFiles';

import * as pacienteCtr from '../../../core/mpi/controller/paciente';
import * as cdaCtr from '../controller/CDAPatient';

import * as stream from 'stream';
import * as base64 from 'base64-stream';
import * as mongoose from 'mongoose';
import * as moment from 'moment';

import { xmlToJson } from '../../../utils/utils';

import { Auth } from '../../../auth/auth.class';

let path = require('path');
let router = express.Router();

/**
 * Genera un CDA con los datos provisto
 */

// {
//  "id": "asdasdasd"
// 	"prestacionSnomed": "1234556",
// 	"fecha": "2017-11-11 12:10:00",
// 	"texto": "esto es una prueba",
// 	"cie10": "A.1.1",
// 	"paciente": {
//      "id": "ID en la org",
// 		"nombre": "Mariano Andres",
// 		"apellido": "Botta",
// 		"sexo": "masculino",
// 		"documento": "34934522",
// 		"fechaNacimiento": "2017-10-10 12:12:12"
// 	},
// 	"profesional": {
// 		"id": "12345567",
// 		"nombre": "Huds",
// 		"apellido": "Doct1or",
//      "documento": "34344567",
//      "matricula": "255"
// 	},
// 	"file": "data:image/jpeg;base64,AEFCSADE2D2D2
// }

router.post('/', cdaCtr.validateMiddleware, async (req: any, res, next) => {
    if (!Auth.check(req, 'cda:post')) {
        return next(403);
    }

    try {
        let idPrestacion = req.body.id;
        let fecha = moment(req.body.fecha).toDate();
        let orgId = req.user.organizacion;

        let yaExiste = await cdaCtr.CDAExists(idPrestacion, fecha, orgId);
        if (yaExiste) {
            return next({error: 'prestacion_existente'});
        }

        let dataPaciente = req.body.paciente;
        let dataProfesional = req.body.profesional;

        let prestacion = await cdaCtr.matchCode(req.body.prestacionSnomed);
        if (!prestacion) {
            return next({error: 'prestacion_invalida'});
        }

        let cie10Code = req.body.cie10;
        let file = req.body.file;
        let texto = req.body.texto;

        // Terminar de decidir esto
        let organizacion = await Organizaciones.findById(orgId);
        let cie10 = null;
        if (cie10Code) {
            cie10 = await Cie10.findOne({ codigo: cie10Code });
            if (!cie10) {
                return next({error: 'cie10_invalid'});
            }
        }

        let paciente = await cdaCtr.findOrCreate(req, dataPaciente, organizacion._id);
        let uniqueId = String(new mongoose.Types.ObjectId());

        let fileData, adjuntos;
        if (file) {
            let fileObj: any = cdaCtr.base64toStream(file);
            fileObj.metadata = {
                cdaId: mongoose.Types.ObjectId(uniqueId),
                paciente: mongoose.Types.ObjectId(paciente.id)
            };
            fileData = await cdaCtr.storeFile(fileObj);
            adjuntos = [{ path: fileData.data, id: fileData.id }];
        }

        let cda = cdaCtr.generateCDA(uniqueId, 'N', paciente, fecha, dataProfesional, organizacion, prestacion, cie10, texto, fileData);

        let metadata = {
            paciente: paciente._id,
            prestacion: prestacion.conceptId,
            fecha: fecha,
            adjuntos: adjuntos,
            extras: {
                id: idPrestacion,
                organizacion: organizacion._id
            }
        };
        let obj = await cdaCtr.storeCDA(uniqueId, cda, metadata);

        res.json({ cda: uniqueId, paciente: paciente._id });

    } catch (e) {
        return next(e);
    }
});

/**
 * Injecta un CDA ya armado al repositorio
 */
router.post('/attach', async (req: any, res, next) => {
    let orgId = req.user.organizacion;
    let cda64 = req.body.cda;
    let adjunto64 = req.body.adjunto;

    let cdaStream: any = cdaCtr.base64toStream(cda64);
    let cdaXml: String = await cdaCtr.streamToString(cdaStream.stream);

    // [TODO] Match de paciente?
    // [TODO] Prestación desde el LOINC?

    if (cdaXml.length > 0) {
        cdaCtr.validateSchemaCDA(cdaXml).then(async () => {
            let dom: any = xmlToJson(cdaXml);
            let cdaData: any = cdaCtr.checkAndExtract(dom);

            if (cdaData) {
                let uniqueId = (new mongoose.Types.ObjectId());

                cdaData.fecha = moment(new Date(cdaData.fecha));
                cdaData.paciente.fechaNacimiento = moment(new Date(cdaData.paciente.fechaNacimiento));
                cdaData.paciente.sexo = cdaData.paciente.sexo === 'M' ? 'masculino' : 'femenino';

                let yaExiste = await cdaCtr.CDAExists(cdaData.id, cdaData.fecha, orgId);
                if (yaExiste) {
                    return next({error: 'prestacion_existente'});
                }

                let prestacion = await cdaCtr.matchCode(cdaData.loinc);
                let paciente = await cdaCtr.findOrCreate(req, cdaData.paciente, orgId);

                let fileData, adjuntos;
                if (cdaData.adjunto && adjunto64) {
                    let fileObj: any = cdaCtr.base64toStream(adjunto64);
                    fileObj.metadata = {
                        cdaId: uniqueId,
                        paciente: mongoose.Types.ObjectId(paciente.id)
                    };
                    fileObj.filename = cdaData.adjunto;
                    fileData = await cdaCtr.storeFile(fileObj);
                    adjuntos = [{ path: fileData.data, id: fileData.id }];
                }

                let metadata = {
                    paciente: paciente._id,
                    prestacion: prestacion.conceptId,
                    fecha: cdaData.fecha,
                    adjuntos: adjuntos,
                    extras: {
                        id: cdaData.id,
                        organizacion: orgId
                    }
                };
                let obj = await cdaCtr.storeCDA(uniqueId, cdaXml, metadata);

                res.json({ cda: uniqueId, paciente: paciente._id });

            }

        }).catch(next);
    } else {
        return next({error: 'xml_file_missing'});
    }

});

/**
 * Devuelve el archivo de estilo para renderizar HTML desde el browser.
 */

router.get('/style/cda.xsl', (req, res, next) => {
    let name = path.join(__dirname, '../controller/cda.xsl');
    res.sendFile(name);
});


/**
 * Devuelve los archivos almacenados por los CDAs
 * Cuando se renderiza un CDA en el browser busca los archivos adjuntos en esta ruta
 */

router.get('/files/:name', async (req: any, res, next) => {
    if (req.user.type === 'user-token' &&  !Auth.check(req, 'cda:get')) {
        return next(403);
    }

    let name = req.params.name;
    let CDAFiles = makeFs();

    CDAFiles.findOne({filename: name}).then(async file => {
        if (req.user.type === 'paciente-token' &&  String(file.metadata.paciente) !== String(req.user.pacientes[0].id) ) {
            return next(403);
        }

        let stream1  = await CDAFiles.readById(file._id);
        res.contentType(file.contentType);
        stream1.pipe(res);
    }).catch(next);
});


/**
 * Devuelve el XML de un CDA según un ID
 */

router.get('/:id', async (req: any, res, next) => {
    if (!Auth.check(req, 'cda:get')) {
        return next(403);
    }

    let _base64 = req.params.id;
    let CDAFiles = makeFs();

    let contexto = await CDAFiles.findById(_base64);
    var stream1 = CDAFiles.readById(_base64, function (err, buffer) {
        res.contentType(contexto.contentType);
        res.end(buffer);
    });
});

/**
 * Listado de los CDAs de un paciente
 * API demostrativa, falta analizar como se va a buscar en el repositorio
 */
router.get('/paciente/:id', async (req: any, res, next) => {
    if (!Auth.check(req, 'cda:list')) {
        return next(403);
    }

    let CDAFiles = makeFs();
    let pacienteID = req.params.id;
    let prestacion = req.query.prestacion;

    let list = await cdaCtr.searchByPatient(pacienteID, prestacion, {skip: 0, limit: 10});
    res.json(list);
});

export = router;

let cdaXml2 = `<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" href="style/cda.xsl"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:voc="urn:hl7-org:v3/voc">
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <!-- CDA ID -->
  <id root="2.16.840.1.113883.2.10.35.1" extension="5ac7a37dcbc67353839715a3"/>
  <code code="26436-6" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Laboratory studies"/>
  <title>Laboratory studies</title>
  <effectiveTime value="20180406014237"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="es-AR"/>
  <versionNumber value="1"></versionNumber>
  <!-- Datos del paciente -->
  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.2.10.35.1" extension="5ac7a376cbc673538397153d"/>
      <id root="2.16.840.1.113883.2.10.35.1.1.1" extension="5ac7a376cbc673538397153d"/>
      <patient>
        <name>
          <given>NELSON</given>
          <given>DAVID</given>
          <family>CANTARUTTI</family>
        </name>
        <administrativeGenderCode codeSystem="2.16.840.1.113883.5.1" code="M" displayName="masculino"/>
        <birthTime value="19620611120000"/>
      </patient>
    </patientRole>
  </recordTarget>
  <!-- Datos del Doctor -->
  <author>
    <time value="20180406014237"/>
    <assignedAuthor>
      <id root="2.16.840.1.113883.2.10.35.1.1.1" extension="5ac7a376cbc673538397153d"/>
      <assignedPerson>
        <name>
          <given>H. BOUQUET ROLDAN</given>
        </name>
      </assignedPerson>
      <representedOrganization>
        <id root="2.16.840.1.113883.2.10.35.1" extension="57e9670e52df311059bc8964"/>
        <name>HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON</name>
      </representedOrganization>
    </assignedAuthor>
  </author>
  <!-- Datos de la organización -->
  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        <id root="2.16.840.1.113883.2.10.35.1" extension="57e9670e52df311059bc8964"/>
        <name>HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON</name>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>

  <documentationOf>
    <serviceEvent classCode="PCPR">
      <effectiveTime value="20161003120000">
        <low value="20161003120000"/>
        <high value="20161003120000"/>
      </effectiveTime>
      <performer typeCode="PRF">
        <functionCode code="PCP" codeSystem="2.16.840.1.113883.5.88"/>
        <assignedEntity>
        <id root="2.16.840.1.113883.2.10.35.1" extension="5ac7a376cbc673538397153d"/>
          <assignedPerson>
            <name>
              <given>H. BOUQUET ROLDAN</given>
            </name>
          </assignedPerson>
          <representedOrganization>
            <id root="2.16.840.1.113883.2.10.35.1" extension="57e9670e52df311059bc8964"/>
            <name>HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON</name>
          </representedOrganization>
        </assignedEntity>
      </performer>
    </serviceEvent>
  </documentationOf>

  <!-- Fecha de la prestación -->
  <componentOf>
    <encompassingEncounter>
      <effectiveTime>
        <low value="20161003120000"></low>
      </effectiveTime>
    </encompassingEncounter>
  </componentOf>

  <component>
    <structuredBody>
      <component>
        <section>
          <code codeSystem="2.16.840.1.113883.6.90" code="Z01.7" codeSystemName="ICD-10" displayName="Examen de laboratorio"/>
          <title>Resumen de la consulta</title>
          <text>Exámen de Laboratorio</text>
        </section>
      </component>
      <component>
        <section>
          <title>Archivo adjunto</title>
          <text>
            <renderMultiMedia referencedObject="Adjunto"/>
          </text>
          <entry>
            <observationMedia classCode="OBS" moodCode="EVN" ID="Adjunto">
              <value xsi:type="ED" mediaType="application/pdf">
                <reference value="files/5ac7a37dcbc67353839715a4.pdf"/>
              </value>
            </observationMedia>
          </entry>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`;

cdaCtr.validateSchemaCDA(cdaXml2).then((dom) => {
  let data = cdaCtr.checkAndExtract2(dom);
  console.log(data);
});



