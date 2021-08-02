import * as builder from 'xmlbuilder';
import { Organization } from '../class/Organization';
import { BaseBuilder } from './BaseBuilder';
export class OrganizationBuilder extends BaseBuilder {

    public build(org: Organization) {
        const custodian = builder.create('custodian')
            .ele('assignedCustodian')
            .ele('representedCustodianOrganization');
        this.createNode(custodian, 'id', org.id());
        this.createNode(custodian, 'name', null, org.name());

        return custodian;
    }
}
