import { IID } from './interfaces';

export class Organization {
    private _id: IID;
    private _name: String;

    id (id: IID = null) {
        return id != null ?  (this._id = id, this) : this._id;
    }

    name (name: String = null) {
        return name != null ?  (this._name = name, this) : this._name;
    }
}
