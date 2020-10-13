import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';

export class RecuperoCostoBody extends HTMLComponent {
    template = `
    <main>
        <section class="ma-50">
            <div class="text-center">
            <b>Anexo 2</b> 
            </div>
            <table class="egt" style="height: 180px; margin-left: auto; margin-right: auto;" width="90%">
                <tbody>
                    <tr>
                        <td colspan="8"><label>COMPROBANTE DE ATENCION DE BENEFICIARIOS DE AGENTES DEL SEGURO SALUD</label></td>
                        <td colspan="1"><label>Fecha</label>
                            {{ fechaActual }}
                        </td>
                    </tr>
                    <tr>
                        <td colspan="8">
                            <label>Denominacion HPdGP</label>  
                            {{ efector }}
                        </td> 
                        <td colspan="1">
                            <label>Codigo HPdGD-REFES</label> 
                            {{ efectorCodigoSisa }}
                        </td>
                    </tr>
                    <tr class="h50">
                        <td colspan="9" class="text-center">
                            <label>DATOS DEL BENEFICIARIO</label>
                        </td>
                    </tr>                  
                    <tr class="h50">
                        <td colspan="8">
                            <label>Apellido y Nombre:</label>  
                            {{ nombre }}
                        </td>               
                        <td colspan="1">
                            <label>DNI N:</label>     
                            {{ dni }}
                        </td>
                    </tr>                               
                </tbody>
            </table>
            <table class="egt" style="margin-left: auto; margin-right: auto;" width="90%">
                <tbody>
                    <tr class="h50">
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
                        <td><label for="">Titular</label>  <input class="ml25" type="checkbox" name="" id=""></td>
                        <td><label for="">Familiar</label>  <input class="ml25" type="checkbox" name="" id=""></td>
                        <td><label for="">Adherente</label>  <input class="ml25" type="checkbox" name="" id=""></td>
                        <td><label for="">Otro</label>  <input class="ml25" type="checkbox" name="" id=""></td>
                        <td><label for="">Cónyuge</label>  <input class="ml25" type="checkbox" name="" id=""></td>
                        <td><label for="">Hijo</label>  <input class="ml25" type="checkbox" name="" id=""></td>
                        <td><label for="">Otro</label>  <input class="ml25" type="checkbox" name="" id=""></td>
                        <td >
                            {{ sexo }}
                        </td>
                        <td>
                            {{ edad }}
                        </td>
                    </tr> 
                </tbody>
            </table>
        
            <table class="egt" style="height: 180px; margin-left: auto; margin-right: auto;" width="90%">
                <tbody>
                    <tr class="h50">
                        <td width="20%"><label>Tipo de Atención</label></td>
                        <td width="15%"></td>
                        <td></td>                        
                        <td width="30%">
                            <label>Fecha de Prestación</label> 
                            {{ horaInicio }}
                        </td>
                    </tr>
                    <tr class="h50">
                        <td rowspan="2"><label>Consulta</label> <input class="ml25" type="checkbox" name="" id=""></td>
                        <td><label for="">Especialidad</label></td>
                        <td colspan="2">
                            {{ tipoPrestacion }}
                        </td>
                    </tr>
                    <tr class="h50">
                        <td><label for="">Diagnostico</label></td>
                        <td colspan="3"></td>
                    </tr>
                    <tr class="h50">
                        <td><label for="">Práctica</label> <input class="ml25" type="checkbox" name="" id=""></td>
                        <td>Códigos NHPdGD</td>
                        <td colspan="3"></td>
                    </tr>
                    <tr class="h50">
                        <td ><label>Internación</label> <input class="ml25" type="checkbox" name="" id=""></td>
                        <td>Diagnostico de
                            Egreso CIE 10</td>
                        <td >Codigos Principal</td>                     
                        <td colspan="3">Otros Codigos</td>        
                    </tr>
                </tbody>
            </table>
            <table class="egt" style="height: 190px;margin-left: auto; margin-right: auto;" width="90%">
                    <tbody>
                        <tr class="font14">
                            <td class="text-center" colspan="6">
                                <label>
                                    NHPdGD: Nomenclador de Hospitales Públicos de Gestión Descentralizada -  CIE10 Clasificación Internacional de Enfermedades
                            </label>
                            </td>    
                        </tr>
                        <tr>
                            <td rowspan="2" class="text-center text-bottom font14" width="60%"><label>Firma del Médico y sello con N° de Matricula</label></td>                       
                            <td rowspan="2" width="10%"><label>Ultimo <br> Recibo de <br> Sueldo</label></td>  
                            <td colspan="2" class="text-center"><label>Mes</label></td> 
                            <td colspan="2" class="text-center"><label>Año</label></td>
                                    
                        </tr>
                        <tr class="h90">
                            <td></td>                       
                            <td></td>  
                            <td></td>                       
                            <td></td>  
                        </tr>                   
                    </tbody>
            </table>   
            <table class="egt" style="margin-left: auto; margin-right: auto;" width="90%">
                <tbody>
                    <tr>
                        <td colspan="3">
                            <label>NOMBRE DEL AGENTE DEL SEGURO DE SALUD</label>
                        </td>
                        <td colspan="3">
                            <label>RNOS</label>
                        </td> 
                    </tr>
                    <tr class="h50">
                        <td colspan="3" >
                            {{ obraSocial }}
                        </td>
                        <td colspan="3">
                            {{ codigoOs }}
                        </td> 
                    </tr>                       
                </tbody>
            </table>   
            <table class="egt" style="margin-left: auto; margin-right: auto;" width="90%">
                <tbody>                   
                    <tr class="h50">
                        <td colspan="2" width="50%">
                            <label>Firma Responsable Administrativo/Contable</label>
                        </td>
                        <td colspan="2">
                            <label>Aclaración Firma</label>
                        </td> 
                        <td colspan="2">
                            <label>Firma Beneficiario</label>
                        </td> 
                    </tr>
                    <tr class="h110">
                        <td colspan="2"></td>
                        <td colspan="2"></td> 
                        <td colspan="2"></td> 
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
