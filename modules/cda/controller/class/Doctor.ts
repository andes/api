import { IID } from './interfaces';
import { Organization } from './Organization';

export class Doctor {
    private id: IID;
    private firstname: String;
    private lastname: String;
    private organization: Organization;

    /**
     * Getters
     */

    getId() {
        return this.id;
    }

    getFirstname() {
        return this.firstname;
    }

    getLastname() {
        return this.lastname;

    }

    getOrganization() {
        return this.organization;

    }

    /**
     * Setters
     */

    setId(id: IID) {
        this.id = id;
        return this;
    }

    setFirstname(name: String) {
        this.firstname = name;
        return this;
    }

    setLastname(name: String) {
        this.lastname = name;
        return this;
    }

    setOrganization(org: Organization) {
        this.organization = org;
        return this;
    }

}
