import moment = require('moment');
import { HTMLComponent } from '../model/html-component.class';

export class InformeCDABody extends HTMLComponent {
    template = `
    <main>
            <section class="contenedor-informe">
                <article class="cabezal-conceptos horizontal">
                    <div class="contenedor-bloque-texto w-3/4" >
                        <div class="tipo-prestacion">
                            {{ titulo }}
                        </div>
                    </div>

                    <div class="contenedor-bloque-texto">
                        <h6 class="bolder">
                            Fecha Consulta
                        </h6>
                        <h6>
                            {{ fechaEjecucion }}hs
                        </h6>
                    </div>
                </article>
                <hr>
                <div>
                <h6>
                    {{{codificacion}}}
                </h6>    
                </div>
            </section>
        </main>
    `;

    constructor(public datos, public organizacion, public paciente) {
        super();
        const fechaEjecucion = this.datos.fecha;
        this.data = {
            titulo: this.datos.prestacion.snomed.term,
            fechaEjecucion: fechaEjecucion && moment(fechaEjecucion).format('DD/MM/YYYY HH:mm'),
            codificacion: this.datos.codificacion?.code?.$?.displayName
        };
    }
}
