import { loadImage } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';

export class ConstanciaPucoHeader extends HTMLComponent {
    template = `<img class="logoHeader" src="data:image/jpg;base64,{{ logo }}">`;

    constructor(tipoFinanciador: String) {
        super();

        this.data = {
            logo: loadImage(`templates/puco/img/header-${ (tipoFinanciador === 'Programa SUMAR' ? `sumar` : `puco`) }.jpg`)
        };
    }
}
