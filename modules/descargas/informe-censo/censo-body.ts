import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';

export class CensoBody extends HTMLComponent {
    template = `
            <!-- Body -->
            <main>
                <section class="contenedor-informe">
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>Cama</th>
                                <th>Ingreso</th>
                                <th>Pase de</th>
                                <th>Egreso</th>
                                <th>Pase a</th>
                                <th>Fecha de ingreso</th>
                                <th>Días Estada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{#each filas}}
                                <tr>
                                    <td> {{ datos.paciente.apellido }}, 
                                        {{#if datos.paciente.alias}}
                                            {{ datos.paciente.alias }}
                                        {{else}}
                                            {{ datos.paciente.nombre }}
                                        {{/if}}
                                        <br> 
                                        {{#if datos.paciente.documento }} 
                                            {{ datos.paciente.documento }}
                                        {{else}}
                                            {{ datos.paciente.numeroIdentificacion }}
                                        {{/if}}
                                    </td>
                                    <td> {{ datos.cama.nombre }},
                                        {{#each datos.cama.sectores}}
                                            {{#if @last}}
                                                {{ nombre }}
                                            {{/if}}
                                        {{/each}}
                                    </td>
                                    <td>
                                        {{#if ingreso }}
                                            {{ ingreso }}
                                        {{/if}}
                                    </td>
                                    <td>
                                        {{#if paseDe }}
                                            {{ paseDe }}
                                        {{/if}}
                                    </td>
                                    <td>
                                        {{#if egreso }}
                                            {{ egreso }}
                                        {{/if}}
                                    </td>
                                    <td>
                                        {{#if paseA }}
                                            {{ paseA }}
                                        {{/if}}
                                    </td>
                                    <td>
                                        {{#if fechaIngreso }}
                                        {{ fechaIngreso }}
                                        {{/if}}
                                    </td>
                                    <td>
                                        {{#if diasEstada }}
                                        {{ diasEstada }}
                                        {{/if}}
                                    </td>
                                </tr>
                            {{/each}}
                        </tbody>
                    </table>
                    <br><br>
                    <table class="resumen table">
                        <thead>
                            <tr>
                                <th rowspan="2">
                                    <h6>Existencia a las 0 hs</h6>
                                </th>
                                <th rowspan="2">
                                    <h6>Ingresos</h6>
                                </th>
                                <th rowspan="2">
                                    <h6>Pases de</h6>
                                </th>
                                <th colspan="2">
                                    <h6>Egreso</h6>
                                </th>
                                <th rowspan="2">
                                    <h6>Pases A</h6>
                                </th>
                                <th rowspan="2">
                                    <h6>Existencia a las 24 hs</h6>
                                </th>
                                <th rowspan="2">
                                    <h6>Ingresos y egresos del día</h6>
                                </th>
                                <th rowspan="2">
                                    <h6>Pacientes día</h6>
                                </th>
                                <!-- <th rowspan="2">
                                    <h6>Camas disponibles a las 0hs</h6>
                                </th> -->
                                <th rowspan="2">
                                    <h6>Días estada</h6>
                                </th>
                                <th rowspan="2">
                                    <h6>Camas disponibles a las 24hs</h6>
                                </th>
                            </tr>
                            <tr>
                                <th>
                                    <h6>Altas</h6>
                                </th>
                                <th>
                                    <h6>Defunciones</h6>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {{#if filaResumen }}
                                <tr>
                                    <td> {{ filaResumen.existencia0 }} </td>
                                    <td> {{ filaResumen.ingresos }} </td>
                                    <td> {{ filaResumen.pasesDe }} </td>
                                    <td> {{ filaResumen.egresosAlta }} </td>
                                    <td> {{ filaResumen.egresosDefuncion }} </td>
                                    <td> {{ filaResumen.pasesA }} </td>
                                    <td> {{ filaResumen.existencia24 }} </td>
                                    <td> {{ filaResumen.ingresoEgresoDia }} </td>
                                    <td> {{ filaResumen.pacientesDia }} </td>
                                    <td> {{ filaResumen.diasEstada }} </td>
                                    <td> {{ filaResumen.disponibles24 }} </td>
                                </tr>
                            {{/if}}
                        </tbody>
                    </table>

                </section>
            </main>
            <!-- END Body -->
    `;

    constructor(public listadoCenso, public resumenCenso) {
        super();

        listadoCenso.map(item => item.fechaIngreso = moment(item.fechaIngreso).format('DD/MM/YYYY HH:mm'));
        this.data = {
            filas: listadoCenso,
            filaResumen: resumenCenso,
        };
    }
}
