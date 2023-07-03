import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';

export class TurnosInformeBody extends HTMLComponent {
    template = `
    <main>
        <section class="contenedor-data-origen">
                    <span class="contenedor-principal-data">
                        <div class="contenedor-secundario">
                            <h2 align="center">
                                Turnos para Matriculación - Fecha: {{ fecha }}
                            </h2>
                            
                        </div>
                    </span>
                </section>
        <section class="contenedor-informe">
            <table class="table table-bordered" align="center">
                <thead>
                    <tr>
                        <th>Profesional</th>
                        <th>DNI</th>
                        <th>Fecha y hora</th>
                        <th>Tipo</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each turno}}
                        <tr>
                            <td> {{ profesional.apellido }}, {{ profesional.nombre }} </td>
                            <td> {{ profesional.documento }}</td>
                            <td> {{ fecha }} </td>
                            <td> {{ tipo }} </td>
                        </tr>
                    {{/each}}
                </tbody>
            </table>
        </section>
    </main>
    `;

    constructor(public turno, public fecha) {
        super();
        turno.map(item => item.fecha = moment(item.fecha).format('DD/MM/YYYY HH:mm'));
        this.data = {
            turno,
            fecha
        };
    }
}
