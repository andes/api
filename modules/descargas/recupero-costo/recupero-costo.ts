import { InformePDF, getAssetsURL } from '../model/informe.class';
import { RecuperoCostoBody } from './recupero-costo-body';
import { RecuperoCostoHeader } from './recupero-costo-header';

export class RecuperoCosto extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/recupero-costo/formulario.scss')
    ];

    public async process() {
        this.header = new RecuperoCostoHeader();
        this.body = new RecuperoCostoBody(this.req.body);

        await super.process();
    }
}
