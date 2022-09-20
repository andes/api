import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';

export class TurnosInformeHeader extends HTMLComponent {
    template = `
                <img class="logoHeader" src="data:image/png;base64,{{ logo }}">
                
           `;
    constructor() {
        super();
        this.data = {
            logo: loadImage('templates/matriculaciones/img/header-matriculaciones.png')
        };
    }
}
