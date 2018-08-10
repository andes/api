import * as builder from 'xmlbuilder';
import { Patient } from '../class/Patient';
import { BaseBuilder } from './BaseBuilder';

import { CDA as CDAConfig } from '../../../../config.private';

export class PatientBuilder extends BaseBuilder {

    public build(patient: Patient) {
        let recordTarget = builder.create('recordTarget').ele('patientRole');

        this.createNode(recordTarget, 'id', patient.getId());

        let dni = patient.getDocumento();
        if (dni) {
            this.createNode(recordTarget, 'id', {
                root: CDAConfig.dniOID,
                extension: dni
            });
        }

        let patientNode = recordTarget.ele('patient');

        let nameNode = patientNode.ele('name');
        this.createNode(nameNode, 'given', null, patient.getFirstname());
        this.createNode(nameNode, 'family', null, patient.getLastname());


        let gender = patient.getGender();
        if (gender) {
            this.createNode(patientNode, 'administrativeGenderCode', {
                codeSystem: '2.16.840.1.113883.5.1',
                code: gender.toLowerCase() === 'masculino' ? 'M' : 'F',
                displayName: gender
            });
        }

        if (patient.getBirthtime()) {
            this.createNode(patientNode, 'birthTime', { value: this.fromDate(patient.getBirthtime()) } );
        }
        return recordTarget;
    }
}
