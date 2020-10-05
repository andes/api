import * as debug from 'debug';
const log = debug('sendSMS');
import * as AWS from 'aws-sdk';
import { SNS } from 'aws-sdk';
import {AWS_CONFIG} from '../././../config.private';

export interface SmsOptions {
    telefono: number;
    mensaje: string;
}

export async function sendSms(smsOptions: SmsOptions) {
    try {
        log('Enviando SMS a ', smsOptions.telefono);
        const argsOperador = {
            telefono: smsOptions.telefono
        };
        AWS.config.region = 'us-east-1';
        AWS.config.update({
            accessKeyId: AWS_CONFIG.ST_AWS_ACCESS_KEY,
            secretAccessKey: AWS_CONFIG.ST_AWS_SECRET_ACCESS_KEY
        });
        const sms: SNS = new AWS.SNS();
        const params: any = {
            Message: smsOptions.mensaje,
            MessageStructure: 'string',
            PhoneNumber: smsOptions.telefono,
            Subject: 'ANDES'
        };
        return await sms.publish(params).promise();
    } catch (error) {
        return error;
    }
}
