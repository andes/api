import { loadImage } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';

export class CertificadoEticaHeader extends HTMLComponent {
    template = '<img class="logoHeader" src="data:image/jpg;base64,{{ logo }}">';

    constructor() {
        super();

        this.data = {
            logo: loadImage('templates/matriculaciones/img/header-matriculaciones.jpg')
        };
    }
}
