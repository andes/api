import { IID } from './interfaces';
import { Organization } from './Organization';

export class Author {
    private _id: IID;
    private _firstname: String;
    private _lastname: String;
    private _organization: Organization;

    id (id: IID = null) {
        return id != null ?  (this._id = id, this) : this._id;
    }

    firstname (firstname: String = null) {
        return firstname != null ?  (this._firstname = firstname, this) : this._firstname;
    }

    lastname (lastname: String = null) {
        return lastname != null ?  (this._lastname = lastname, this) : this._lastname;
    }

    organization (organization: Organization = null) {
        return organization != null ?  (this._organization = organization, this) : this._organization;
    }
}
