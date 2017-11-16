import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId } from '../class/interfaces';
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

        var xml = builder.create('ClinicalDocument')
                         .att('xmlns', 'urn:hl7-org:v3')
                         .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
                         .att('xmlns:voc', 'urn:hl7-org:v3/voc');

        this.createNode(xml, 'typeId', cda.typeId());
        this.createNode(xml, 'id', cda.id());
        this.createNode(xml, 'code', cda.code());
        this.createNode(xml, 'title', null, cda.title());
        this.createNode(xml, 'effectiveTime', { value: this.fromDate(cda.effectiveTime()) });
        this.createNode(xml, 'confidentialityCode', cda.confidentialityCode());
        this.createNode(xml, 'languageCode', cda.languageCode());
        this.createNode(xml, 'versionNumber', cda.versionNumber());

        if (cda.setId()) {
            this.createNode(xml, 'setId', cda.setId());
        }

        if (cda.teplatesId().length > 0) {
            cda.teplatesId().forEach(item => {
                this.createNode(xml, 'templateId', item);
            });
        }

        if (cda.patient()) {
            let patientBuilder = new PatientBuilder();
            let template = patientBuilder.build(cda.patient() as Patient);
            xml.importDocument(template);
        }

        if (cda.author()) {
            let authorBuilder = new AuthorBuilder();
            let template = authorBuilder.build(cda.author() as Author);
            xml.importDocument(template);
        }

        if (cda.custodian()) {
            let orgBuilder = new OrganizationBuilder();
            let template = orgBuilder.build(cda.custodian() as Organization);
            xml.importDocument(template);
        }

        let body: Body = cda.body() as Body;
        if (body) {
            let mainComponent = xml.ele('component').ele('structuredBody');
            body.component().forEach(item => {
                let builderComponent = item.builderFactory();
                let template = builderComponent.build(item);
                mainComponent.importDocument(template);
            });
        }

        return xml.end({ pretty: true});
    }

}
