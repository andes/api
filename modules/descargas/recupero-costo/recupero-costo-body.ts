import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';

export class RecuperoCostoBody extends HTMLComponent {
    template = `
    <main>
        <section class="mx">
            <div class="text-center">
                <b>Anexo 2</b>
            </div>
            <div class="mx text-right">
            {{ fechaActual }}
            </div>
            <hr>
            <h5 class="text-center">COMPROBANTE DE ATENCIÓN DE BENEFICIARIOS DE AGENTES DEL SEGURO SALUD</h5>
            <div class="mx">
            {{#efector}}
                <b>Denominacion HPdGP:</b>
                {{ efector }}
            {{/efector}}

            {{#efectorCodigoSisa}}
                <b>Codigo HPdGD-REFES:</b>
                Sarasa
                {{ efectorCodigoSisa }}
            {{/efectorCodigoSisa}}
            </div>
                <table class="egt">
                <tbody>
                    <tr class="">
                        <td colspan="9" class="text-center">
                            <label>DATOS DEL BENEFICIARIO</label>
                        </td>
                    </tr>
                    <tr class="">
                        <td colspan="6">
                            <label >Apellido y Nombre:</label>
                            {{ nombre }}
                        </td>
                        <td colspan="3">
                            <label >DNI N°:</label>
                            {{ dni }}
                        </td>
                    </tr>
                    <tr class="">
                        <td colspan="4" width="40%">
                            <label>Tipo de Beneficiario</label>
                        </td>
                        <td colspan="3" width="30%">
                            <label>Parentesco</label>
                        </td>
                        <td width="10%">
                            <label>Sexo</label>
                        </td>
                        <td width="10%">
                            <label>Edad</label>
                        </td>
                    </tr>
                    <tr class="h50">
                        <td><label for="">Titular</label><br><input type="checkbox" name="" id=""></td>
                        <td><label for="">Familiar</label><br><input type="checkbox" name="" id=""></td>
                        <td><label for="">Adherente</label><br><input type="checkbox" name="" id=""></td>
                        <td width="10%"><label for="">Otro</label><br><input type="checkbox" name="" id=""></td>
                        <td><label for="">Cónyuge</label><br><input type="checkbox" name="" id=""></td>
                        <td><label for="">Hijo</label><br><input type="checkbox" name="" id=""></td>
                        <td><label for="">Otro</label><br><input type="checkbox" name="" id=""></td>
                        <td >
                            {{ sexo }}
                        </td>
                        <td>
                            {{ edad }}
                        </td>
                    </tr>
                    <tr class="">
                        <td colspan="5"><label >Tipo de Atención:</label></td>
                        <td colspan="4">
                        <label >Fecha de Prestación:</label>
                            {{ horaInicio }}
                        </td>
                    </tr>
                    <tr class="">
                        <td rowspan="2"><label>Consulta</label> <input type="checkbox" name="" id=""></td>
                        <td colspan="8"><label >Especialidad: </label>
                            {{ tipoPrestacion }}
                        </td>
                    </tr>
                    <tr class="h50">
                        <td colspan="8"><label class="casilla-dato">Diagnóstico: </label></td>
                    </tr>
                    <tr class="">
                        <td><label for="">Práctica</label> <input type="checkbox" name="" id=""></td>
                        <td>Códigos NHPdGD</td>
                        <td colspan="7"></td>
                    </tr>
                    <tr class="">
                        <td ><label>Internación</label> <input type="checkbox" name="" id=""></td>
                        <td>Diagnostico de
                            Egreso CIE 10</td>
                        <td colspan="3">
                            <label class="casilla-dato">Código Principal:</label>
                        </td>
                        <td colspan="4">
                            <label class="casilla-dato">Otros Códigos:</label>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table class="egt">
                <tbody>
                    <tr class="">
                        <td class="text-center" colspan="7">
                            <label>
                                NHPdGD: Nomenclador de Hospitales Públicos de Gestión Descentralizada<br>
                                CIE10 Clasificación Internacional de Enfermedades
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="3"></td>
                        <td colspan="4">
                            <label>Último Recibo de Sueldo</label>
                        </td>
                    </tr>
                    <tr>
                        <td rowspan="4" colspan="3" class="text-center text-bottom">
                            <label>Firma del Médico y sello con N° de Matricula</label>
                        </td>
                        <td colspan="2" class="text-center"><label>Mes</label></td>
                        <td colspan="2" class="text-center"><label>Año</label></td>
                    </tr>
                    <tr class="">
                        <td colspan="2" class="h20"></td>
                        <td colspan="2" class="h20"></td>
                    </tr>
                    <tr>
                        <td colspan="3">
                            <label>NOMBRE DEL AGENTE DEL SEGURO DE SALUD</label>
                        </td>
                        <td colspan="3">
                            <label>RNOS</label>
                        </td>
                    </tr>
                    <tr class="">
                        <td colspan="3" class="h20">
                            {{ obraSocial }}
                        </td>
                        <td colspan="3" class="h20">
                            {{ codigoOs }}
                        </td>
                    </tr>
                    <tr class="h50">
                        <td colspan="3"></td>
                        <td colspan="2"></td>
                        <td colspan="2"></td>
                    </tr>
                    <tr class="">
                        <td colspan="3" width="50%">
                            <label>Firma Responsable Administrativo/Contable</label>
                        </td>
                        <td colspan="2">
                            <label>Aclaración Firma</label>
                        </td>
                        <td colspan="2">
                            <label>Firma Beneficiario</label>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
    </main>
    `;

    constructor(public _data) {
        super();
        this.data = {
            fechaActual: moment(new Date()).locale('es').format('DD [de] MMMM [de] YYYY'),
            efector: _data.efector,
            efectorCodigoSisa: _data.efectorCodigoSisa,
            nombre: _data.nombre,
            dni: _data.dni,
            sexo: _data.sexo,
            edad: _data.edad,
            horaInicio: _data.horaInicio,
            tipoPrestacion: _data.tipoPrestacion,
            obraSocial: _data.obraSocial,
            codigoOs: _data.codigoOs
        };
    }
}
