import { InformePDF, getAssetsURL } from '../model/informe.class';
import { CertificadoEticaHeader } from './certificado-etica-header';
import { CertificadoEticaBody } from './certificado-etica-body';
import { CertificadoEticaFooter } from './certificado-etica-footer';

export class CertificadoEtica extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/matriculaciones/certificado-etica.scss')
    ];

    public async process() {
        this.header = new CertificadoEticaHeader();
        this.body = new CertificadoEticaBody(this.req.body);
        this.footer = new CertificadoEticaFooter();

        await super.process();
    }
}
