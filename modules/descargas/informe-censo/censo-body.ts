import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';

export class CensoBody extends HTMLComponent {
    template = `
            <!-- Body -->
            <main>
                <section class="contenedor-informe">
                    <table class="resumen table table-bordered">
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
                                    Existencia a las 0 hs
                                </th>
                                <th rowspan="2">
                                    Ingresos
                                </th>
                                <th rowspan="2">
                                    Pases de
                                </th>
                                <th colspan="2">
                                    Egreso
                                </th>
                                <th rowspan="2">
                                    Pases A
                                </th>
                                <th rowspan="2">
                                    Existencia a las 24 hs
                                </th>
                                <th rowspan="2">
                                    Ingresos y egresos del día
                                </th>
                                <th rowspan="2">
                                    Pacientes día
                                </th>
                                <!-- <th rowspan="2">
                                    Camas disponibles a las 0hs
                                </th> -->
                                <th rowspan="2">
                                    Días estada
                                </th>
                                <th rowspan="2">
                                    Camas disponibles a las 24hs
                                </th>
                            </tr>
                            <tr>
                                <th>
                                    Altas
                                </th>
                                <th>
                                    Defunciones
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
