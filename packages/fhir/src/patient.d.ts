export as namespace patient;

export interface Patient {

    encode (patient: any);
    decode (patient: any);
    verify (patient: any);
}

export declare const Patient: Patient;