import { DerivacionBody } from './derivacion-body';
import { DerivacionHeader } from './derivacion-header';
import { InformePDF, getAssetsURL } from '../model/informe.class';

export class Derivacion extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/com/comprobante.scss')
    ];

    public async process() {
        this.header = new DerivacionHeader();
        this.body = new DerivacionBody(this.req.body);

        await super.process();
    }

}
