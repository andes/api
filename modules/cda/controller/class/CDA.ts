import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId, ITemplateId } from './interfaces';
import { Patient } from './Patient';
import { Author } from './Author';
import { Organization } from './Organization';
import { Body } from './Body';

export * from './interfaces';

export class CDA {
    private _typeId;
    private _id: IID;
    private _code: ICode;
    private _title: String;

    private _confidentialityCode: IConfidentialityCode;
    private _languageCode: ILanguageCode;
    private _setId: ISetId;
    private _versionNumber: Number;
    private _templateId: ITemplateId[];

    // La fecha en la que se crea el CDA
    private _effectiveTime: Date;
    // Fecha en la que se realiza la prestación
    private _date: Date;

    // Entities
    private _patient: Patient;
    private _author: Author;
    private _custodian: Organization;
    private _body: Body;

    constructor () {
        this._effectiveTime = new Date();
        this._templateId = [];
        this._typeId = {
            root: '2.16.840.1.113883.1.3',
            extension: 'POCD_HD000040'
        };
        this._confidentialityCode = {
            code: 'N',
            codeSystem: '2.16.840.1.113883.5.25'
        };

        this._languageCode = {
            code: 'es-AR'
        };
    }

    typeId (typeId: IID = null) {
        return typeId != null ?  (this._typeId = typeId, this) : this._typeId;
    }

    id (id: IID = null) {
        return id != null ?  (this._id = id, this) : this._id;
    }

    code (code: ICode = null) {
        return code != null ?  (this._code = code, this) : this._code;
    }

    title (title: String = null) {
        return title != null ?  (this._title = title, this) : this._title;
    }

    effectiveTime (effectiveTime: Date = null) {
        return effectiveTime != null ?  (this._effectiveTime = effectiveTime, this) : this._effectiveTime;
    }

    confidentialityCode (confidentialityCode: IConfidentialityCode = null) {
        return confidentialityCode != null ?  (this._confidentialityCode = confidentialityCode, this) : this._confidentialityCode;
    }

    languageCode (languageCode: ILanguageCode = null) {
        return languageCode != null ?  (this._languageCode = languageCode, this) : this._languageCode;
    }

    setId (setId: ISetId = null) {
        return setId != null ?  (this._setId = setId, this) : this._setId;
    }

    versionNumber (versionNumber: Number = null) {
        return versionNumber != null ?  (this._versionNumber = versionNumber, this) : this._versionNumber;
    }


    date (date: Date = null) {
        return date != null ?  (this._date = date, this) : this._date;
    }

    body (body: Body = null) {
        return body != null ?  (this._body = body, this) : this._body;
    }

    patient (patient: Patient = null) {
        return patient != null ?  (this._patient = patient, this) : this._patient;
    }

    author (author: Author = null) {
        return author != null ?  (this._author = author, this) : this._author;
    }

    custodian (custodian: Organization = null) {
        return custodian != null ?  (this._custodian = custodian, this) : this._custodian;
    }

    teplatesId() {
        return this._templateId;
    }

    addTemplateId (root: String) {
        this._templateId.push({ root });
    }

    /**
     * Getters
     */

    // getTypeId() {
    //     return this._typeId;
    // }

    // getId() {
    //     return this._id;
    // }

    // getSetId() {
    //     return this._setId;
    // }

    // getVersionNumber() {
    //     return this._versionNumber;
    // }

    // getCode() {
    //     return this._code;
    // }

    // getTitle() {
    //     return this._title;
    // }

    // getEffectiveTime() {
    //     return this._effectiveTime;
    // }

    // getConfidentialityCode() {
    //     return this._confidentialityCode;
    // }

    // getLanguageCode() {
    //     return this._languageCode;
    // }

    // getPatient() {
    //     return this._patient;
    // }

    // getAuthor() {
    //     return this._author;
    // }

    // getCustodian() {
    //     return this._custodian;
    // }

    // __setId(_id: IID) {
    //     this._id = _id;
    //     return this;
    // }

    // setSetId(code: ISetId) {
    //     this._setId = code;
    //     return this;
    // }

    // setVersionNumber(version: Number) {
    //     this._versionNumber = version;
    //     return this;
    // }

    // setCode(_code: ICode) {
    //     this._code = _code;
    //     return this;
    // }

    // setTitle(title: String) {
    //     this._title = title;
    //     return this;
    // }

    // setEffectiveTime(date: Date) {
    //     this._effectiveTime = date;
    //     return this;
    // }

    // setConfidentialityCode(code: IConfidentialityCode) {
    //     this._confidentialityCode = code;
    //     return this;
    // }

    // setLanguageCode(code: ILanguageCode) {
    //     this._languageCode = code;
    //     return this;
    // }

    // setPatient(value: Patient) {
    //     this._patient = value;
    //     return this;
    // }

    // setAuthor(value: Doctor) {
    //     this._author = value;
    //     return this;
    // }

    // setCustodian(value: Organization) {
    //     this._custodian = value;
    //     return this;
    // }
}
