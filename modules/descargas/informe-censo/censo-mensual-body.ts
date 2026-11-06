import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';

export class CensoMensualBody extends HTMLComponent {
    template = `
    <!-- Body -->
    <main>
        <section class="contenedor-informe">
            <table class="resumen table">
                <thead>
                    <tr>
                        <th rowspan="2">
                            Fecha
                        </th>
                        <th rowspan="2">
                            Existencia 0 hs
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
                            Existencia 24 hs
                        </th>
                        <th rowspan="2">
                            Ingresos- Egresos día
                        </th>
                        <th rowspan="2">
                            Pacientes día
                        </th>
                        <th rowspan="2">
                            Camas disponibles 24hs
                        </th>
                        <th rowspan="2">
                            Días de estada
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
                    {{#each filas}}
                        <tr>
                            <td> {{ fecha }} </td>
                            <td> {{ censo.existencia0 }} </td>
                            <td> {{ censo.ingresos }} </td>
                            <td> {{ censo.pasesDe }} </td>
                            <td> {{ censo.egresosAlta }} </td>
                            <td> {{ censo.egresosDefuncion }} </td>
                            <td> {{ censo.pasesA }} </td>
                            <td> {{ censo.existencia24 }} </td>
                            <td> {{ censo.ingresoEgresoDia }} </td>
                            <td> {{ censo.pacientesDia }} </td>
                            <td> {{ censo.disponibles24 }} </td>
                            <td> {{ censo.diasEstada }} </td>
                        </tr>
                    {{/each}}
                    <tr>
                        <td><strong>Totales</strong></td>
                        <td><strong> {{ censoTot.existencia0 }}</strong></td>
                        <td><strong> {{ censoTot.ingresos}} </strong></td>
                        <td><strong> {{ censoTot.pasesDe }}</strong></td>
                        <td><strong> {{ censoTot.egresosAlta }}</strong></td>
                        <td><strong> {{ censoTot.egresosDefuncion }}</strong></td>
                        <td><strong> {{ censoTot.pasesA }}</strong></td>
                        <td><strong> {{ censoTot.existencia24 }}</strong></td>
                        <td><strong> {{ censoTot.ingresoEgresoDia }}</strong></td>
                        <td><strong> {{ censoTot.pacientesDia }}</strong></td>
                        <td><strong> {{ censoTot.disponibles24 }}</strong></td>
                        <td><strong> {{ censoTot.diasEstada }}</strong></td>
                    </tr>
                </tbody>
            </table>

            <br>
            <table class="resumen table">
                <thead>
                    <tr>
                        <th rowspan="2">
                            Días de funcionamiento del servicio
                        </th>
                        <th rowspan="2">
                            Promedio diario de camas disponibles
                        </th>
                        <th rowspan="2">
                            Promedio diario de paciente día
                        </th>
                        <th rowspan="2">
                            Tasa de mortalidad hospitalaria
                        </th>
                        <th rowspan="2">
                            Promedio de permanencia
                        </th>
                        <th rowspan="2">
                            Giro Cama
                        </th>
                        <th rowspan="2">
                            Promedio días de estada
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{ resumen.diasF }}</td>
                        <td>{{ resumen.promDis }}</td>
                        <td>{{ resumen.pacDia }}</td>
                        <td>{{ resumen.mortHosp }}</td>
                        <td>{{ resumen.promPer }}</td>
                        <td>{{ resumen.giroCama }}</td>
                        <td>{{ resumen.promDiasEstada }}</td>
                    </tr>
                </tbody>
            </table>
        </section>
    </main>
    <!-- END Body -->
   `;

    constructor(public listadoCenso, public resumenCenso, public datosCenso) {
        super();

        listadoCenso.map((item) => {
            item.fecha = moment(item.fecha).format('DD/MM/YYYY');
        });

        this.data = {
            filas: listadoCenso,
            censoTot: resumenCenso,
            resumen: datosCenso,
        };
    }
}
