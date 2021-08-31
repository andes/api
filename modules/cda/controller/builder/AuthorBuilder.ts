import * as builder from 'xmlbuilder';
import { Author } from '../class/Author';
import { BaseBuilder } from './BaseBuilder';
import { Organization } from '../class/Organization';
import { CDA as CDAConfig } from '../../../../config.private';

export class AuthorBuilder extends BaseBuilder {
    private completed = true;

    constructor(completed = true) {
        super();
        this.completed = completed;
    }

    public build(doctor: Author) {
        const author = builder.create('author');
        this.createNode(author, 'time', { value: this.fromDate(new Date()) });

        const assignedAuthor = author.ele('assignedAuthor');
        if (doctor.id()) {
            this.createNode(assignedAuthor, 'id', doctor.id());
        }

        if (doctor.documento()) {
            this.createNode(assignedAuthor, 'id', {
                root: CDAConfig.dniOID,
                extension: doctor.documento()
            });
        }

        if (doctor.matricula()) {
            this.createNode(assignedAuthor, 'id', {
                root: CDAConfig.matriculaOID,
                extension: doctor.matricula()
            });
        }

        if (doctor.id()) {
            this.createNode(assignedAuthor, 'id', doctor.id());
        }

        const assignedPerson = assignedAuthor.ele('assignedPerson');
        const nameNode = assignedPerson.ele('name');
        nameNode.com('Nombre del profesional');
        this.createNode(nameNode, 'given', null, doctor.firstname());
        nameNode.com('Apellido del profesional');
        this.createNode(nameNode, 'family', null, doctor.lastname());

        if (this.completed) {
            const org = doctor.organization() as Organization;
            if (org) {
                const representedOrganization = assignedAuthor.ele('representedOrganization');
                this.createNode(representedOrganization, 'id', org.id());
                this.createNode(representedOrganization, 'name', null, org.name());
            }
        }

        return author;
    }
}
