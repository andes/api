import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';

export class FichaEpidemiologicaHeader extends HTMLComponent {
    template = `
        <img class="logoHeader" src="data:image/png;base64,{{ logos.andes }}">            
    `;

    constructor(public detalle) {
        super();
    }

    public async process() {
        this.data = {
            tipo: this.detalle.type.name.toUpperCase(),
            logos: {
                andes: loadImage('templates/ficha-epidemiologica/img/logoEpidemio.png')
            },
        };
    }
}
