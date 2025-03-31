import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';

export class FarmaciaBody extends HTMLComponent {
    template = `
      <main>
        <table border="1" width="100%" class="tabla-header">
          <tr>
          <td width="30%"><b>Paciente: </b>{{encabezado.data.apellido }}   {{encabezado.data.nombre}}</td>
          <td width="20%"><b>Fecha de Nacimiento: </b>{{encabezado.data.fechanacimiento}}</td>
          <td width="15%"><b>Género: </b>{{encabezado.data.sexo}}</td>
          <td width="15%"><b>DNI: </b>{{encabezado.data.documento}}</td>
        </tr>
        <tr>
          <td width="30%"><b>Solicitante: </b>{{encabezado.data.medicoSolicitante}}</td>
          <td width="20%"><b>Orden Nro: </b> {{encabezado.data.numero}}</td>
          <td width="15%"><b>Fecha: </b>{{encabezado.data.fecha}}</td>
          <td width="15%"><b>Origen: </b>{{encabezado.data.origen}}</td>
        </tr>
        <tr>
          <td width="30%"><b>Efector solicitante: </b>{{encabezado.data.efectorSolicitante}}</td>
          <td width="20%"><b>Laboratorio: </b>{{encabezado.data.Laboratorio}}</td>
          {{#if encabezado}}
                  {{#if encabezado.data}}
                        {{#if encabezado.data.estado}}
                                <td width="15%"><b>Estado: </b>{{encabezado.data.estado}}</td>
                        {{/if}}
                  {{/if}}
          {{/if}}
          <td width="15%"><b>Tipo de muestra: </b>{{encabezado.data.tipoMuestra}}</td>
        </tr>
         <td width="50%"><b>Prácticas solicitadas: </b>{{encabezado.data.practicasSolicitadas}}</td>
      </table>

      {{#each areas}}
        <div class="tituloGeneral"><u>{{area}}</u> </div>
        {{#each grupos}}
          {{#if visible}}
            <div class="tituloSecundario"><b> {{grupo}} </b></div>
          {{/if}}
          {{#each items}}
            {{#if esTitulo}}
              <div class="tituloTabla"><u>{{nombre}}</u></div>
            {{else}}
              <table class="tituloTabla">
                <tr>
                  <td width="25%">{{nombre}}</td>
                  <td width="25%"><i>{{resultado }} {{ unidadMedida}}</i></td>
                  <td width="25%">{{valorReferencia }} {{metodo}}</td>
                  <td width="25%"><i>{{userValida}}</i></td>
                </tr>
              </table>
            {{/if}}
          {{/each}}
        {{/each}}
      {{/each}}
        </main>
    `;

    constructor(public encabezado, public paciente, public detalle) {
        super();
    }

    public async process() {
        this.encabezado.data.fecha = moment(this.encabezado.data.fecha).format('DD-MM-YYYY');
        this.encabezado.data.fechanacimiento = moment(this.encabezado.data.fechanacimiento).format('DD-MM-YYYY');
        this.encabezado.data.sexo = this.paciente[0].genero;
        if (this.encabezado.data.estado !== 'EnProceso') {
            this.encabezado.data.estado = null;
        } else {
            this.encabezado.data.estado = 'En Proceso';
        }

        if (this.paciente[0].alias) {
            this.encabezado.data.nombre = this.paciente[0].alias;
        }
        this.data = {
            areas: this.detalle,
            encabezado: this.encabezado
        };
    }
}
