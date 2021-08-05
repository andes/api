import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';

export class RecuperoCostoHeader extends HTMLComponent {
    template = `<div class="login-header">
                    <img class="logo-gobierno" src="data:image/jpg;base64,{{ logo }}">
                    <img class="logo-gobierno-salud" src="data:image/jpg;base64,{{ logoSalud }}">
                </div>`;

    constructor() {
        super();

        this.data = {
            logo: loadImage('templates/recupero-costo/img/logo.png'),
            logoSalud: loadImage('templates/recupero-costo/img/logosalud.png')
        };
    }
}
