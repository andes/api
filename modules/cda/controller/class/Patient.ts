import { IID } from './interfaces';

export class Patient {
    private firstname: String;
    private lastname: String;
    private birthTime: String;
    private gender: String;
    private id: IID;

    constructor () {

    }

    /**
     * Getters
     */

    getFirstname() {
        return this.firstname;
    }

    getLastname() {
        return this.lastname;
    }

    getBirthtime() {
        return this.birthTime;
    }

    getGender() {
        return this.gender;
    }

    getId() {
        return this.id;
    }


    /**
     * Setters
     */

    setFirstname(name: String) {
        this.firstname = name;
        return this;
    }

    setLastname(name: String) {
        this.lastname = name;
        return this;
    }

    setBirthtime(date: String) {
        this.birthTime = date;
        return this;
    }

    setGender(gender: String) {
        this.gender = gender;
        return this;
    }

    setId(id: IID) {
        this.id = id;
        return this;
    }
}
