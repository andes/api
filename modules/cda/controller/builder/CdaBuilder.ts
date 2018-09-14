import { CDA } from '../class/CDA';
import { Body } from '../class/Body';
import * as builder from 'xmlbuilder';
import { PatientBuilder } from './PatientBuilder';
import { AuthorBuilder } from './AuthorBuilder';
import { OrganizationBuilder } from './OrganizationBuilder';
import { BaseBuilder } from './BaseBuilder';
import { Patient } from '../class/Patient';
import { Author } from '../class/Author';
import { Organization } from '../class/Organization';
import { CDA as CDAConfig } from '../../../../config.private';

export class CDABuilder extends BaseBuilder {

    public build(cda: CDA) {

        const xml = builder.create('ClinicalDocument')
            .att('xmlns', 'urn:hl7-org:v3')
            .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
            .att('xmlns:voc', 'urn:hl7-org:v3/voc');

        xml.instructionBefore('xml-stylesheet', 'type="text/xsl" href="style/cda.xsl"');
        xml.com('** CDA Header ** ');
        this.createNode(xml, 'realmCode', cda.realmCode());
        this.createNode(xml, 'typeId', cda.typeId());
        xml.com(' Identificador único del documento ');
        this.createNode(xml, 'id', cda.id());
        xml.com(' Clasificación del documento ');
        this.createNode(xml, 'code', cda.code());
        xml.com(' Título ');
        this.createNode(xml, 'title', null, cda.title());
        xml.com(' Fecha de Creación del documento ');
        this.createNode(xml, 'effectiveTime', { value: this.fromDate(cda.effectiveTime()) });
        xml.com(' Código de Confidencialidad ');
        this.createNode(xml, 'confidentialityCode', cda.confidentialityCode());
        xml.com(' Código de Lenguaje: español de Argentina ');
        this.createNode(xml, 'languageCode', cda.languageCode());
        xml.com(' Versión del documento ');
        this.createNode(xml, 'versionNumber', { value: cda.versionNumber() });

        if (cda.setId()) {
            this.createNode(xml, 'setId', cda.setId());
        }

        if (cda.teplatesId().length > 0) {
            cda.teplatesId().forEach(item => {
                this.createNode(xml, 'templateId', item);
            });
        }

        if (cda.patient()) {
            xml.com('Datos del paciente');
            const patientBuilder = new PatientBuilder();
            const template = patientBuilder.build(cda.patient() as Patient);
            xml.importDocument(template);
        }

        if (cda.author()) {
            xml.com('Datos del Autor del Informe ');
            let authorBuilder = new AuthorBuilder();
            let template = authorBuilder.build(cda.author() as Author);
            xml.importDocument(template);
        }

        if (cda.custodian()) {
            xml.com('Datos de la custodia');
            let orgBuilder = new OrganizationBuilder();
            let template = orgBuilder.build(cda.custodian() as Organization);
            xml.importDocument(template);
        }

        let date = cda.date() as Date;
        let serviceEvent = xml.ele('documentationOf').ele('serviceEvent', { classCode: 'PCPR' });
        serviceEvent.com('Datos de la prestación Snomed ');
        if (cda.type()) {
            this.createNode(serviceEvent, 'code', cda.type());
        }
        if (date) {
            const efTime = serviceEvent.ele('effectiveTime', { value: this.fromDate(date) });
            efTime.ele('low', { value: this.fromDate(date) });
            efTime.ele('high', { value: this.fromDate(date) });
        }


        if (date) {
            let elem = xml.ele('componentOf').ele('encompassingEncounter');
            elem.ele('effectiveTime').ele('low', { value: this.fromDate(date) });
        }


        const performer = serviceEvent.ele('performer', { typeCode: 'PRF' });
        performer.ele('functionCode', { code: 'PCP', codeSystem: '2.16.840.1.113883.5.88' });
        const assignedEntity = performer.ele('assignedEntity');

        if (cda.author()) {
            let doctor = cda.author() as Author;

            if (doctor.documento()) {
                this.createNode(assignedEntity, 'id', {
                    root: CDAConfig.dniOID,
                    extension: doctor.documento()
                });
            }
            let assignedPerson = assignedEntity.ele('assignedPerson');
            let nameNode = assignedPerson.ele('name');
            this.createNode(nameNode, 'given', null, doctor.firstname());
            this.createNode(nameNode, 'family', null, doctor.lastname());

            if (doctor.organization()) {
                let org = doctor.organization() as Organization;
                let representedOrganization = assignedEntity.ele('representedOrganization');
                this.createNode(representedOrganization, 'id', org.id());
                this.createNode(representedOrganization, 'name', null, org.name());
            }
        }

        const body: Body = cda.body() as Body;
        if (body) {
            xml.com(' Cuerpo de CDA ');
            let mainComponent = xml.ele('component').ele('structuredBody');
            body.component().forEach(item => {
                const builderComponent = item.builderFactory();
                const template = builderComponent.build(item);
                mainComponent.importDocument(template);
            });
        }

        return xml.end({ pretty: true });
    }

}
