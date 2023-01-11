import { InformePDF, getAssetsURL } from '../model/informe.class';
import { CertificadoEticaHeader } from './certificado-etica-header';
import { CredencialProfesionalBody } from './credencial-profesional-body';
import { CertificadoEticaFooter } from './certificado-etica-footer';
import { Types } from 'mongoose';
import { Profesional } from '../../../core/tm/schemas/profesional';

export class CredencialProfesional extends InformePDF {
    constructor(private profesionalId: string | Types.ObjectId, private formacionGradoId: string | Types.ObjectId, private qrcode: string) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/matriculaciones/credencial-profesional.scss')
    ];

    public async process() {
        const profesional: any = await Profesional.findById(this.profesionalId);
        const qrdecod = atob(this.qrcode);
        this.body = new CredencialProfesionalBody(profesional, this.formacionGradoId, qrdecod);
        await super.process();
    }
}
