import * as debug from 'debug';
const log = debug('sendSMS');
import { SNS, config } from 'aws-sdk';
import {AWS_CONFIG} from '../././../config.private';

export interface SmsOptions {
    prefijo: string;
    telefono: number;
    mensaje: string;
}
export async function sendSms(smsOptions: SmsOptions) {
    try {
        log('Enviando SMS a ', smsOptions.telefono);
        const prefix = smsOptions.prefijo ? smsOptions.prefijo : '+54';
        const argsOperador = {
            telefono: prefix + smsOptions.telefono
        };
        config.region = AWS_CONFIG.ST_AWS_REGION;
        config.update({
            accessKeyId: AWS_CONFIG.ST_AWS_ACCESS_KEY,
            secretAccessKey: AWS_CONFIG.ST_AWS_SECRET_ACCESS_KEY
        });
        const sms: SNS = new SNS();
        config.region = AWS_CONFIG.ST_AWS_REGION;
        config.update({
            accessKeyId: AWS_CONFIG.ST_AWS_ACCESS_KEY,
            secretAccessKey: AWS_CONFIG.ST_AWS_SECRET_ACCESS_KEY
        });
        const params: any = {
            Message: smsOptions.mensaje,
            MessageStructure: 'string',
            PhoneNumber: argsOperador.telefono,
            Subject: 'ANDES'
        };
        return await sms.publish(params).promise();
    } catch (error) {
        log('Error envio de sms ', error);
        return error;
    }
}
