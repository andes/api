import { HTMLComponent } from '../../model/html-component.class';
import * as moment from 'moment';
export class VacunasComponent extends HTMLComponent {
    template = `
    <div class="nivel-1">
    <p>
        {{ registro.concepto.term }}
        {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}:
    </p>

</div>
</br>
<section class="contenedor-data-origen">



    <div class="contenedor-secundario" style = "float: left;width:50%">
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Vacunador:
            </h6>
            <h6>
                {{ vacunadorApellido }},{{ vacunadorNombre }}
            </h6>

        </div>
        <br>
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Categoria:
            </h6>
            <h6>
                {{ categoria }}
            </h6>

        </div>
        <br>
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Vacuna:
            </h6>
            <h6>
                {{ vacuna }}
            </h6>

        </div>
        <br>
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Dosis:
            </h6>
            <h6>
                {{ dosis }}
            </h6>

        </div>
        <br>
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Laboratorio:
            </h6>
            <h6>
                {{ laboratorio }}
            </h6>

        </div>
    </div>




    <div class="contenedor-secundario" style = "float: left;width:50%">
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Fecha de Aplicacion:
            </h6>
            <h6>
                {{ fechaAplicacion }}
            </h6>

        </div>
        <br>
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Condicion:
            </h6>
            <h6>
                {{ condicion }}
            </h6>

        </div>
        <br>
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Esquema:
            </h6>
            <h6>
                {{ esquema }}
            </h6>

        </div>
        <br>
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Lote:
            </h6>
            <h6>
                {{ lote }}
            </h6>

        </div>
        <br>
        <div class="contenedor-bloque-texto">
            <h6 class="bolder">
                Fecha Vencimiento:
            </h6>
            <h6>
                {{ fechaVencimiento }}
            </h6>

        </div>

    </div>


</section>
<br>
<div class="contenedor-bloque-texto">
    <h6 class="bolder">
        Comentario:
    </h6>
    <h6>
        {{ comentario }}
    </h6>

</div>




        `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        this.data = {
            registro: this.registro,
            fechaAplicacion: moment(this.registro.valor.vacuna.fechaAplicacion).format('DD/MM/YYYY'),
            vacunadorNombre: this.registro.valor.vacuna.vacunador.nombre,
            vacunadorApellido: this.registro.valor.vacuna.vacunador.apellido,
            categoria: this.registro.valor.vacuna.categoria.nombre,
            condicion: this.registro.valor.vacuna.condicion.nombre,
            vacuna: this.registro.valor.vacuna.vacuna.nombre,
            esquema: this.registro.valor.vacuna.esquema.nombre,
            dosis: this.registro.valor.vacuna.dosis.nombre,
            lote: this.registro.valor.vacuna.lote,
            laboratorio: this.registro.valor.vacuna.laboratorio.nombre,
            fechaVencimiento: moment(this.registro.valor.vacuna.fechaVencimiento).format('DD/MM/YYYY'),
            comentario: this.registro.valor.vacuna.comentarios
        };

    }

}
