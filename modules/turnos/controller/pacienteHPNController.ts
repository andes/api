import * as sql from 'mssql';
import * as moment from 'moment';

export async function savePaciente(paciente: any, transaction) {
    console.log('savePaciente');

    let fechaCreacion = moment(new Date()).format('YYYY-MM-DD hh:mm:ss');
    let fechaUltimoAcceso = fechaCreacion;
    let fechaActualizacion = fechaCreacion;
    let hcTipo = 1; // HARDCODE
    let hcNumero = '\'' + 'PDR' + paciente.documento + '\'';
    let tipoDocumento = '\'DNI\'';
    let nroDocumento = paciente.documento;
    let apellido = '\'' + paciente.apellido + '\'';
    let nombre = '\'' + paciente.nombre + '\'';
    let estadoCivil =  (paciente.estadoCivil ? '\'' + paciente.estadoCivil + '\'' : null);
    let nacionalidad = null; // HARDCODE
    let fechaNacimiento = (paciente.fechaNacimiento ? moment(paciente.fechaNacimiento).format('YYYY-MM-DD hh:mm:ss') : null);
    let localidadNacimiento = null; // HARDCODE
    let provinciaNacimiento = null; // HARDCODE
    let fechaFallecimiento = (paciente.fechaFallecimiento ? '\'' + paciente.fechaFallecimiento + '\'' : null);
    let sexo = '\'' + paciente.sexo  + '\'';

    let codigoPostal = null;
    let localidad = null;
    let barrio = null;

    if (paciente.direccion[0]) {
        codigoPostal = (paciente.direccion[0] ? '\'' + paciente.direccion[0].codigoPostal  + '\'' : null) ;
        localidad = (paciente.direccion[0].ubicacion.localidad ? '\'' + paciente.direccion[0].ubicacion.localidad.nombre  + '\'' : null);
        barrio = (paciente.direccion[0].ubicacion.barrio ? '\'' + paciente.direccion[0].ubicacion.barrio.nombre  + '\'' : null);
    }

    let paraje = null;
    let calle = null;
    let numero = null;
    let piso = null;
    let departamento = null;

    let calleIzquierda = null;
    let calleDerecha = null;
    let calleParalela = null;
    let completarios = null;
    let telefonoCaracteristica = null;
    let telefonoNumero = null;
    let educacion = null;
    let ocupacion = null;
    let ocupacionLugar = null;
    let ocupacionDireccion = null;
    let ocupacionTelefono = null;
    let ocupacionContacto = null;
    let ocupacionART = null;
    let madreHC = null;
    let madreApellido = null;
    let madreNombre = null;
    let madreTipodeDocumento = null;
    let madreDocumento = null;
    let madreEducacion = null;
    let madreOcupacion = null;
    let padreHC = null;
    let padreApellido = null;
    let padreNombre = null;
    let padreTipodeDocumento = null;
    let padreDocumento = null;
    let padreEducacion = null;
    let padreOcupacion = null;
    let oSCodigo = null;
    let oNumero = null;
    let oSResponsable = null;
    let oSCarga = null;
    let estaEnArchivo = 0; // Que valor es?
    let archivoEstante = null;
    let archivoSector = null;
    let dadodebaja = 0; // Que valor es?
    let bajaCausa = null;
    let bajaFecha = null;
    let observaciones = null;
    let informacionContacto = null;
    let antecedentesFamiliares = null;
    let antecedentesHabitos = null;
    let creadoEnPacs =  0; // Que valor es?
    let actualizarPacs = 0; // Que valor es?
    let actualizarLatLong = 0; // Que valor es?
    let direccionLatitud = null;
    let direccionLongitud = null;

    let query = 'INSERT INTO dbo.Historias_Clinicas ' +
        '(HC_Fecha_de_creacion ' +
        ',HC_Fecha_de_ultimo_acceso ' +
        ',HC_Fecha_Actualizacion ' +
        ',HC_Tipo ' +
        ',HC_Numero ' +
        ',HC_Tipo_de_documento ' +
        ',HC_Documento ' +
        ',HC_Apellido ' +
        ',HC_Nombre ' +
        ',HC_Estado_Civil ' +
        ',HC_Nacionalidad ' +
        ',HC_Sexo ' +
        ',HC_Nacimiento_Fecha ' +
        ',HC_Nacimiento_Localidad ' +
        ',HC_Nacimiento_Provincia ' +
        ',HC_Fallecimiento_Fecha ' +
        ',HC_Direccion_Codigo_Postal ' +
        ',HC_Direccion_Localidad ' +
        ',HC_Direccion_Barrio ' +
        ',HC_Direccion_Paraje ' +
        ',HC_Direccion_Calle ' +
        ',HC_Direccion_Numero ' +
        ',HC_Direccion_Piso ' +
        ',HC_Direccion_Dpto ' +
        ',HC_Direccion_CalleIzquierda ' +
        ',HC_Direccion_CalleDerecha ' +
        ',HC_Direccion_CalleParalela ' +
        ',HC_Direccion_Completarios ' +
        ',HC_Telefono_Caracteristica ' +
        ',HC_Telefono_Numero ' +
        ',HC_Educacion ' +
        ',HC_Ocupacion ' +
        ',HC_Ocupacion_Lugar ' +
        ',HC_Ocupacion_Direccion ' +
        ',HC_Ocupacion_Telefono ' +
        ',HC_Ocupacion_Contacto ' +
        ',HC_Ocupacion_ART ' +
        ',HC_Madre_HC ' +
        ',HC_Madre_Apellido ' +
        ',HC_Madre_Nombre ' +
        ',HC_Madre_Tipo_de_Documento ' +
        ',HC_Madre_Documento ' +
        ',HC_Madre_Educacion ' +
        ',HC_Madre_Ocupacion ' +
        ',HC_Padre_HC ' +
        ',HC_Padre_Apellido ' +
        ',HC_Padre_Nombre ' +
        ',HC_Padre_Tipo_de_Documento ' +
        ',HC_Padre_Documento ' +
        ',HC_Padre_Educacion ' +
        ',HC_Padre_Ocupacion ' +
        ',HC_OS_Codigo ' +
        ',HC_OS_Numero ' +
        ',HC_OS_Responsable ' +
        ',HC_OS_Carga ' +
        ',HC_Esta_en_Archivo ' +
        ',HC_Archivo_Estante ' +
        ',HC_Archivo_Sector ' +
        ',HC_Dado_de_baja ' +
        ',HC_Baja_Causa ' +
        ',HC_Baja_Fecha ' +
        ',HC_Observaciones ' +
        ',HC_InformacionContacto ' +
        ',HC_Antecedentes_Familiares ' +
        ',HC_Antecedentes_Habitos ' +
        ',creadoEnPacs ' +
        ',actualizarPacs ' +
        ',actualizarLatLong ' +
        ',HC_Direccion_Latitud ' +
        ',HC_Direccion_Longitud) ' +
    'VALUES (' +
        '\'' + fechaCreacion + '\',' +
        '\'' + fechaUltimoAcceso + '\',' +
        '\'' + fechaActualizacion + '\',' +
        hcTipo + ',' +
        hcNumero + ',' +
        tipoDocumento + ',' +
        nroDocumento + ',' +
        apellido + ',' +
        nombre + ',' +
        estadoCivil + ',' +
        nacionalidad + ',' +
        sexo + ',' +
        '\'' + fechaNacimiento + '\',' +
        localidadNacimiento + ',' +
        provinciaNacimiento + ',' +
        fechaFallecimiento + ',' +
        codigoPostal  + ',' +
        localidad + ',' +
        barrio + ',' +
        paraje + ',' +
        calle + ',' +
        numero + ',' +
        piso + ',' +
        departamento + ',' +
        calleIzquierda + ',' +
        calleDerecha + ',' +
        calleParalela + ',' +
        completarios + ',' +
        telefonoCaracteristica + ',' +
        telefonoNumero + ',' +
        educacion + ',' +
        ocupacion + ',' +
        ocupacionLugar + ',' +
        ocupacionDireccion + ',' +
        ocupacionTelefono + ',' +
        ocupacionContacto + ',' +
        ocupacionART + ',' +
        madreHC + ',' +
        madreApellido + ',' +
        madreNombre + ',' +
        madreTipodeDocumento + ',' +
        madreDocumento + ',' +
        madreEducacion + ',' +
        madreOcupacion + ',' +
        padreHC + ',' +
        padreApellido + ',' +
        padreNombre + ',' +
        padreTipodeDocumento + ',' +
        padreDocumento + ',' +
        padreEducacion + ',' +
        padreOcupacion + ',' +
        oSCodigo + ',' +
        oNumero + ',' +
        oSResponsable + ',' +
        oSCarga + ',' +
        estaEnArchivo + ',' +
        archivoEstante + ',' +
        archivoSector + ',' +
        dadodebaja + ',' +
        bajaCausa + ',' +
        bajaFecha + ',' +
        observaciones + ',' +
        informacionContacto + ',' +
        antecedentesFamiliares + ',' +
        antecedentesHabitos + ',' +
        creadoEnPacs + ',' +
        actualizarPacs + ',' +
        actualizarLatLong + ',' +
        direccionLatitud + ',' +
        direccionLongitud + ')';

    return await new sql.Request(transaction).query(query);
}
