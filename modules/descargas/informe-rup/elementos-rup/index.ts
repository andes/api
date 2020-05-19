import { ObservacionesComponent } from './observaciones-component';
import { MoleculaBaseComponent } from './molecula-base-component';
import { ValorNumericoComponent } from './valor-numerico-component';
import { ValorNumericoFactory } from './valor-numerico-factory';
import { ValorFechaComponent } from './valor-fecha-component';
import { SolicitudPrestacionDefaultComponent } from './solicitud-default-component';
import { SelectPorRefsetComponent } from './select-por-refset-component';
import { RegistrarMedicamentoDefaultComponent } from './registrar-medicamento-default-component';
import { LugarDeNacimientoComponent } from './lugar-nacimiento-componenet';
import { LactanciaComponent } from './lactancia-component';
import { FormulaBaseComponent } from './formula-base-component';
import { SeleccionBinariaComponent } from './seleccion-binaria-component';
import { EvolucionProblemaDefaultComponent } from './evolucion-problema-default-component';
import { CalculoDeBostonComponent } from './calculo-boston-component';
import { AutocitadoComponent } from './autocitado-component';
import { AdjuntarDocumentoComponent } from './adjuntar-documento-component';
import { SelectPrestacionComponent } from './select/select-prestacion.component';
import { SelectOrganizacionComponent } from './select/select-organizacion.component';
import { SelectSnomedComponent } from './select/select-snomed.component';
import { SelectProfesionalComponent } from './select/select-profesional.component';
import { SelectStaticComponent } from './select/select-static.component';
import { SeccionadoComponent } from './seccion/seccionado.component';
import { SeccionComponent } from './seccion/seccion.component';
import { InformeEpicrisisComponent } from './informe-epicrisis.component';

/**
 * [TODO] ProcedimientoDeEnfermeriaComponent
 * [TODO] OdontogramaRefsetComponent
 * [TODO] InternacionIngresoComponent
 * [TODO] InternacionEgresoComponent
 * [TODO] GraficoLinealComponent
 * [TODO] DesarrolloPsicomotorComponent -> NO SE VE EN DEMO
 */

export const ElementosRUPHTML = {
    SelectOrganizacionComponent,
    SelectPrestacionComponent,
    SelectProfesionalComponent,
    SelectSnomedComponent,
    SelectStaticComponent,
    SeccionadoComponent,
    SeccionComponent,

    ValorNumericoComponent,
    ValorFechaComponent,
    ObservacionesComponent,
    FormulaBaseComponent,
    MoleculaBaseComponent,

    SelectPorRefsetComponent,
    SolicitudPrestacionDefaultComponent,
    RegistrarMedicamentoDefaultComponent,
    LugarDeNacimientoComponent,

    // Estos atomos hay que migrarlos a MoleculaBaseComponent
    SignosVitalesComponent: MoleculaBaseComponent,
    TensionArterialComponent: MoleculaBaseComponent,
    TensionArterialPediatricaComponent: MoleculaBaseComponent,
    RegistrarMedidasAntropometricasNinoM2AComponent: MoleculaBaseComponent,
    RegistrarMedidasAntropometricasNinoE3Y6AComponent: MoleculaBaseComponent,
    RegistrarMedidasAntropometricasNinoE2Y3AComponent: MoleculaBaseComponent,
    IndiceDeMasaCorporalComponent: MoleculaBaseComponent,
    HipertensionArterialComponent: MoleculaBaseComponent,

    ConsultaDeNinoSanoM2AComponent: MoleculaBaseComponent,
    ConsultaDeNinoSanoE3Y6AComponent: MoleculaBaseComponent,
    ConsultaDeNinoSanoE2Y3AComponent: MoleculaBaseComponent,


    // Todo estos atomos hay que migrarlos al valor numerico
    TensionDiastolicaComponent: ValorNumericoFactory('mmHG'),
    TensionSistolicaComponent: ValorNumericoFactory('mmHG'),
    TemperaturaComponent: ValorNumericoFactory('°C'),
    PesoComponent: ValorNumericoFactory('Kg'),
    FrecuenciaRespiratoriaComponent: ValorNumericoFactory('PPM'),
    FrecuenciaCardiacaComponent: ValorNumericoFactory('PPM'),
    SaturacionOxigenoComponent: ValorNumericoFactory('%'),
    TallaComponent: ValorNumericoFactory('cm'),
    PerimetroCefalicoComponent: ValorNumericoFactory('cm'),
    CircunferenciaCinturaComponent: ValorNumericoFactory('cm'),
    PercentiloTallaComponent: ValorNumericoFactory(''),
    PercentiloPesoComponent: ValorNumericoFactory(''),
    PercentiloDeTensionArterialComponent: ValorNumericoFactory(''),
    PercentiloDeMasaCorporalComponent: ValorNumericoFactory(''),
    FiltradoGlomerularComponent: ValorNumericoFactory('ml/min'),

    InformesComponent: ObservacionesComponent,
    ResumenHistoriaClinicaComponent: ObservacionesComponent,
    OtoemisionAcusticaDeOidoIzquierdoComponent: ObservacionesComponent,
    OtoemisionAcusticaDeOidoDerechoComponent: ObservacionesComponent,

    LactanciaComponent,
    DesarrolloPsicomotorComponent: LactanciaComponent,

    SeleccionBinariaComponent,
    EvolucionProblemaDefaultComponent,
    CalculoDeBostonComponent,
    AutocitadoComponent,
    AdjuntarDocumentoComponent,

    ElementoDeRegistroComponent: SeccionComponent,
    InformeEpicrisisComponent
};
