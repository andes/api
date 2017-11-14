import { IID } from './interfaces';

export class Organization {
    private id: IID;
    private name: String;

    /**
     * Getters
     */

    getId() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    /**
     * Setters
     */


    setId(id: IID) {
        this.id = id;
        return this;
    }

    setName(name: String) {
        this.name = name;
        return this;
    }
}
