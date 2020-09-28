import { loadImage } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';

export class ConstanciaPucoHeader extends HTMLComponent {
    template = `<img class="logoHeader" src="data:image/jpg;base64,{{ logo }}">`;

    constructor(tipoFinanciador: String) {
        super();

        this.data = {
            logo: loadImage(`templates/puco/img/${(tipoFinanciador === 'Programa SUMAR' ? `header-sumar.png` : `header-puco.jpg`)}`)
        };
    }
}
