import { HTMLComponent } from '../model/html-component.class';

export class FarmaciaHeader extends HTMLComponent {

    template = `
<div class="contenedor-principal-data">
  <div class="contenedor-secundario">
    <h5>Resultados de Laboratorio</h5>
    <h4>{{ organizacion }}</h4>
  </div>
</div>
<hr/>
`;

    constructor(public encabezado) {
        super();
    }

    public async process() {
        this.data = {
            organizacion: this.encabezado.data.Efector || this.encabezado.data.Laboratorio,
        };
    }
}
