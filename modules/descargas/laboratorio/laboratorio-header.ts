import { HTMLComponent } from '../model/html-component.class';

export class FarmaciaHeader extends HTMLComponent {
    template = `
    <div class="contenedor-secundario">
        Resultados de Laboratorio
        <h3>{{encabezado.data.Laboratorio}}"</h3>
    </div>
    <div class="contenedor-secundario">
    <hr/>
   `;

    constructor(public encabezado) {
        super();
    }

    public async process() {
        this.data = {
            encabezado: this.encabezado
        };
    }
}
