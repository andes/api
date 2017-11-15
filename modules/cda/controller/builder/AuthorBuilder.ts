import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId } from '../class/interfaces';
import { CDA } from '../class/CDA';
import * as builder from 'xmlbuilder';
import { Patient } from '../class/Patient';
import { Doctor } from '../class/Doctor';
import { BaseBuilder } from './BaseBuilder';
export class AuthorBuilder extends BaseBuilder {

    public build(doctor: Doctor) {
        let author = builder.create('author');
        this.createNode(author, 'time', { value: Date.now() } );

        let assignedAuthor = author.ele('assignedAuthor');
        if (doctor.getId()) {
            this.createNode(assignedAuthor, 'id', doctor.getId());
        }

        let assignedPerson = assignedAuthor.ele('assignedPerson');
        let nameNode = assignedPerson.ele('name');
        this.createNode(nameNode, 'given', null, doctor.getFirstname());
        this.createNode(nameNode, 'family', null, doctor.getLastname());

        let org = doctor.getOrganization();
        if (org) {
            let representedOrganization = assignedAuthor.ele('representedOrganization');
            this.createNode(representedOrganization, 'id', org.getId());
            this.createNode(representedOrganization, 'name', null, org.getName());
        }

        return author;
    }
}
