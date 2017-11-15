import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId } from '../class/interfaces';
import { CDA } from '../class/CDA';
import { Body } from '../class/Body';
import * as builder from 'xmlbuilder';
import { PatientBuilder } from './PatientBuilder';
import { AuthorBuilder } from './AuthorBuilder';
import { OrganizationBuilder } from './OrganizationBuilder';
import { BaseBuilder } from './BaseBuilder';

export class CDABuilder extends BaseBuilder {

    public build(cda: CDA) {

        var xml = builder.create('ClinicalDocument')
                         .att('xmlns', 'urn:hl7-org:v3')
                         .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
                         .att('xmlns:voc', 'urn:hl7-org:v3/voc');


        this.createNode(xml, 'typeId', cda.getTypeId());
        this.createNode(xml, 'id', cda.getId());
        this.createNode(xml, 'code', cda.getCode());
        this.createNode(xml, 'title', null, cda.getTitle());
        this.createNode(xml, 'effectiveTime', {value: cda.getEffectiveTime().getTime() });
        this.createNode(xml, 'confidentialityCode', cda.getConfidentialityCode());
        this.createNode(xml, 'languageCode', cda.getLanguageCode());
        this.createNode(xml, 'setId', cda.getSetId());
        this.createNode(xml, 'versionNumber', cda.getVersionNumber());

        if (cda.teplatesId().length > 0) {
            cda.teplatesId().forEach(item => {
                this.createNode(xml, 'templateId', item);
            });
        }

        if (cda.getPatient()) {
            let patientBuilder = new PatientBuilder();
            let template = patientBuilder.build(cda.getPatient());
            xml.importDocument(template);
        }

        if (cda.getAuthor()) {
            let authorBuilder = new AuthorBuilder();
            let template = authorBuilder.build(cda.getAuthor());
            xml.importDocument(template);
        }

        if (cda.getCustodian()) {
            let orgBuilder = new OrganizationBuilder();
            let template = orgBuilder.build(cda.getCustodian());
            xml.importDocument(template);
        }

        if (cda.body()) {
            let mainComponent = xml.ele('component').ele('structuredBody');

            (cda.body() as Body).component().forEach(item => {
                let builderComponent = item.builderFactory();
                let template = builderComponent.build(item);
                mainComponent.importDocument(template);
            });
        }


        return xml.end({ pretty: true});
    }

}
