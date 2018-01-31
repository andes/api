import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId } from '../class/interfaces';
import { CDA } from '../class/CDA';
import * as builder from 'xmlbuilder';
import { Patient } from '../class/Patient';
import { Author } from '../class/Author';
import { BaseBuilder } from './BaseBuilder';
import { Organization } from '../class/Organization';
export class AuthorBuilder extends BaseBuilder {
    private completed = true;

    constructor (completed = true) {
        super();
        this.completed = completed;
    }

    public build(doctor: Author) {
        let author = builder.create('author');
        this.createNode(author, 'time', { value: this.fromDate(new Date()) } );

        let assignedAuthor = author.ele('assignedAuthor');
        if (doctor.id()) {
            this.createNode(assignedAuthor, 'id', doctor.id());
        }

        let assignedPerson = assignedAuthor.ele('assignedPerson');
        let nameNode = assignedPerson.ele('name');
        this.createNode(nameNode, 'given', null, doctor.firstname());
        this.createNode(nameNode, 'family', null, doctor.lastname());

        if (this.completed) {
            let org = doctor.organization() as Organization;
            if (org) {
                let representedOrganization = assignedAuthor.ele('representedOrganization');
                this.createNode(representedOrganization, 'id', org.id());
                this.createNode(representedOrganization, 'name', null, org.name());
            }
        }

        return author;
    }
}
