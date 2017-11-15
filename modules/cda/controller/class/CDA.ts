import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId, ITemplateId } from './interfaces';
import { Patient } from './Patient';
import { Doctor } from './Doctor';
import { Organization } from './Organization';
import { Body } from './Body';

export class CDA {
    private typeId;
    private id: IID;
    private code: ICode;
    private title: String;
    private effectiveTime: Date;
    private confidentialityCode: IConfidentialityCode;
    private languageCode: ILanguageCode;
    private _setId: ISetId;
    private versionNumber: Number;
    private templateId: ITemplateId[];

    // Entities
    private patient: Patient;
    private author: Doctor;
    private custodian: Organization;
    private _body: Body;

    constructor () {
        this.templateId = [];
        this.typeId = {
            root: '2.16.840.1.113883.1.3',
            extension: 'POCD_HD000040'
        };
        this.confidentialityCode = {
            code: 'N',
            codeSystem: '2.16.840.1.113883.5.25'
        };

        this.languageCode = {
            code: 'es-AR'
        };
    }


    body (body = null) {
        return body != null ?  (this._body = body, this) : this._body;
    }

    /**
     * Getters
     */

    getTypeId() {
        return this.typeId;
    }

    getId() {
        return this.id;
    }

    getSetId() {
        return this._setId;
    }

    getVersionNumber() {
        return this.versionNumber;
    }

    getCode() {
        return this.code;
    }

    getTitle() {
        return this.title;
    }

    getEffectiveTime() {
        return this.effectiveTime;
    }

    getConfidentialityCode() {
        return this.confidentialityCode;
    }

    getLanguageCode() {
        return this.languageCode;
    }

    getPatient() {
        return this.patient;
    }

    getAuthor() {
        return this.author;
    }

    getCustodian() {
        return this.custodian;
    }

    teplatesId() {
        return this.templateId;
    }

    /**
     * Setters
     */

    addTemplateId (root) {
        this.templateId.push({ root });
    }

    setId(_id: IID) {
        this.id = _id;
        return this;
    }

    setSetId(code: ISetId) {
        this._setId = code;
        return this;
    }

    setVersionNumber(version: Number) {
        this.versionNumber = version;
        return this;
    }

    setCode(_code: ICode) {
        this.code = _code;
        return this;
    }

    setTitle(title: String) {
        this.title = title;
        return this;
    }

    setEffectiveTime(date: Date) {
        this.effectiveTime = date;
        return this;
    }

    setConfidentialityCode(code: IConfidentialityCode) {
        this.confidentialityCode = code;
        return this;
    }

    setLanguageCode(code: ILanguageCode) {
        this.languageCode = code;
        return this;
    }

    setPatient(value: Patient) {
        this.patient = value;
        return this;
    }

    setAuthor(value: Doctor) {
        this.author = value;
        return this;
    }

    setCustodian(value: Organization) {
        this.custodian = value;
        return this;
    }
}
