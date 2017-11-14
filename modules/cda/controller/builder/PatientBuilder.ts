import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId } from '../class/interfaces';
import { CDA } from '../class/CDA';
import * as builder from 'xmlbuilder';
import { Patient } from '../class/Patient';

export class PatientBuilder {

    public build(patient: Patient) {
        let recordTarget = builder.create('recordTarget').ele('patientRole');

        this.createNode(recordTarget, 'id', patient.getId());

        let patientNode = recordTarget.ele('patient');

        let nameNode = patientNode.ele('name');
        this.createNode(nameNode, 'given', null, patient.getFirstname());
        this.createNode(nameNode, 'family', null, patient.getLastname());

        if (patient.getBirthtime()) {
            this.createNode(patientNode, 'birthTime', { value: patient.getBirthtime().getTime() } );
        }

        let gender = patient.getGender();
        if (gender) {
            this.createNode(patientNode, 'administrativeGenderCode', {
                codeSyatem: '2.16.840.1.113883.5.1',
                code: gender.toLowerCase() === 'masculino' ? 'M' : 'F',
                displayName: gender
            });
        }
        return recordTarget;
    }


    public createNode(root, tag, attrs, text = null) {
        if (attrs) {
            root.ele(tag, attrs);
        } else if (text) {
            root.ele(tag, {}, text);
        }
    }
}
