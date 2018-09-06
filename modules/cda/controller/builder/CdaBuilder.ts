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

export class CDABuilder extends BaseBuilder {

    public build(cda: CDA) {

        const xml = builder.create('ClinicalDocument')
            .att('xmlns', 'urn:hl7-org:v3')
            .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
            .att('xmlns:voc', 'urn:hl7-org:v3/voc');

        xml.instructionBefore('xml-stylesheet', 'type="text/xsl" href="style/cda.xsl"');

        this.createNode(xml, 'typeId', cda.typeId());
        xml.com('CDA ID');
        this.createNode(xml, 'id', cda.id());
        this.createNode(xml, 'code', cda.code());
        this.createNode(xml, 'title', null, cda.title());
        this.createNode(xml, 'effectiveTime', { value: this.fromDate(cda.effectiveTime()) });
        this.createNode(xml, 'confidentialityCode', cda.confidentialityCode());
        this.createNode(xml, 'languageCode', cda.languageCode());
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
            xml.com('Datos del Doctor');
            const authorBuilder = new AuthorBuilder();
            const template = authorBuilder.build(cda.author() as Author);
            xml.importDocument(template);
        }

        if (cda.custodian()) {
            xml.com('Datos de la organización');
            const orgBuilder = new OrganizationBuilder();
            const template = orgBuilder.build(cda.custodian() as Organization);
            xml.importDocument(template);
        }

        const date = cda.date() as Date;
        const serviceEvent = xml.ele('documentationOf').ele('serviceEvent', { classCode: 'PCPR' });
        if (date) {
            const efTime = serviceEvent.ele('effectiveTime', { value: this.fromDate(date) });
            efTime.ele('low', { value: this.fromDate(date) });
            efTime.ele('high', { value: this.fromDate(date) });
        }


        if (date) {
            xml.com('Fecha de la prestación');
            const elem = xml.ele('componentOf').ele('encompassingEncounter');
            elem.ele('effectiveTime').ele('low', { value: this.fromDate(date) });
        }


        const performer = serviceEvent.ele('performer', { typeCode: 'PRF' });
        performer.ele('functionCode', { code: 'PCP', codeSystem: '2.16.840.1.113883.5.88' });
        const assignedEntity = performer.ele('assignedEntity');

        if (cda.author()) {
            const doctor = cda.author() as Author;
            const assignedPerson = assignedEntity.ele('assignedPerson');
            const nameNode = assignedPerson.ele('name');
            this.createNode(nameNode, 'given', null, doctor.firstname());
            this.createNode(nameNode, 'family', null, doctor.lastname());
        }

        if (cda.custodian()) {
            const org = cda.custodian() as Organization;
            const representedOrganization = assignedEntity.ele('representedOrganization');
            this.createNode(representedOrganization, 'id', org.id());
            this.createNode(representedOrganization, 'name', null, org.name());
        }

        const body: Body = cda.body() as Body;
        if (body) {
            const mainComponent = xml.ele('component').ele('structuredBody');
            body.component().forEach(item => {
                const builderComponent = item.builderFactory();
                const template = builderComponent.build(item);
                mainComponent.importDocument(template);
            });
        }

        return xml.end({ pretty: true });
    }

}
