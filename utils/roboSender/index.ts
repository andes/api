import { roboModel } from './roboSchema';

export interface ISms {
    phone: string;
    message: string;
}

export interface IEmail {
    email: string;
    subject: string;
    template: string;
    extras: any;
    plainText: string;
}

export function sendSms (data: ISms, options: any = {}) {
    let obj = new roboModel({
        message: data.message,
        phone: data.phone,
        from: options.from ? options.from : 'undefined',
        tries: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledAt: options.scheduledAt ? options.scheduledAt : new Date()
    });
    return obj.save();
}



