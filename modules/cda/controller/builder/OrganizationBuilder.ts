import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId } from '../class/interfaces';
import { CDA } from '../class/CDA';
import * as builder from 'xmlbuilder';
import { Patient } from '../class/Patient';
import { Doctor } from '../class/Doctor';
import { Organization } from '../class/Organization';

export class OrganizationBuilder {

    public build(org: Organization) {
        let custodian = builder.create('custodian')
                               .ele('assignedCustodian')
                               .ele('representedCustodianOrganization');
        this.createNode(custodian, 'id', org.getId());
        this.createNode(custodian, 'name', null, org.getName());

        return custodian;
    }


    public createNode(root, tag, attrs, text = null) {
        if (attrs) {
            root.ele(tag, attrs);
        } else if (text) {
            root.ele(tag, {}, text);
        }
    }
}
