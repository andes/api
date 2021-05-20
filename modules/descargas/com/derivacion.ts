import { getAssetsURL, InformePDF } from '../model/informe.class';
import { DerivacionBody } from './derivacion-body';
import { DerivacionHeader } from './derivacion-header';

export class Derivacion extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/com/comprobante.scss')
    ];

    public async process() {
        this.header = new DerivacionHeader();
        const { _id, historial } = this.req.body.derivacion;
        const organizacionId = this.req.body.organizacionId;
        this.body = new DerivacionBody({ _id, historial, organizacionId });
        await super.process();
    }

}
