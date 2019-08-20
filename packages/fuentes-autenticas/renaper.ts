import * as soap from 'soap';
import { renaper as RenaperConfig } from '../../config.private';

async function soapRequest(persona: any) {
    const sexo = persona.sexo === 'masculino' ? 'M' : 'F';
    const documento = persona.documento;

    const autenticationClient = await soap.createClientAsync(RenaperConfig.url);
    if (autenticationClient) {
        const credenciales = {
            Usuario: RenaperConfig.Usuario,
            password: RenaperConfig.password
        };
        const [session] = await autenticationClient.LoginPecasAsync(credenciales);

        if (session && session.return) {
            const args = {
                IdSesion: session.return['$value'],
                Base: 'PecasAutorizacion'
            };

            await autenticationClient.FijarBaseDeSesionAsync(args);
            const autorizationClient = await soap.createClientAsync(RenaperConfig.serv);

            const args2 = {
                IdSesionPecas: session.return['$value'],
                Cliente: 'ANDES SISTEMA',
                Proveedor: 'GP-RENAPER',
                Servicio: 'WS_RENAPER_documento',
                DatoAuditado: `documento=${documento};sexo=${sexo}`,
                Operador: 'andes',
                Cuerpo: 'hola',
                Firma: false,
                CuerpoFirmado: false,
                CuerpoEncriptado: false
            };

            const [respuesta] = await autorizationClient.Solicitar_ServicioAsync(args2);
            if (respuesta && respuesta.return) {
                return respuesta.return;
            }
        }
    }
    return null;
}

/**
 * Recupera los datos de una persona de renaper. Espera documento y sexo.
 * @param {object} persona Datos de la persona a verificar
 * @param {function} formatter Función para transformar los datos.
 */

export async function renaper(persona: any, formatter: (persona: any) => any = null) {
    const soapResp = await soapRequest(persona);
    if (soapResp.Resultado['$value']) {
        const resultado = Buffer.from(soapResp.Resultado['$value'], 'base64').toString('utf8');
        const datos = JSON.parse(resultado);
        return formatter ? formatter(datos) : datos;
    } else {
        return null;
    }
}

/**
 * Transforma los datos de Renaper al formato ANDES
 */
export function renaperToAndes(ciudadano) {
    let paciente;
    let fecha;
    paciente = {};
    if (ciudadano.nombres) {
        paciente.nombre = ciudadano.nombres;
    }
    if (ciudadano.apellido) {
        paciente.apellido = ciudadano.apellido;
    }
    if (ciudadano.cuil) {
        paciente.cuil = ciudadano.cuil;
    }
    // Se arma un objeto de dirección
    paciente.direccion = [];
    let domicilio;
    domicilio = {
        valor: ''
    };
    if (ciudadano.calle) {
        domicilio.valor += `${ciudadano.calle} ${ciudadano.numero}`;
        if (ciudadano.piso) {
            domicilio.valor += ` ${ciudadano.piso} ${ciudadano.departamento}`;
        }
    }

    if (ciudadano.cpostal) {
        domicilio.codigoPostal = ciudadano.cpostal;
    }
    let ubicacion;
    ubicacion = {};
    ubicacion.localidad = {};
    ubicacion.provincia = {};
    ubicacion.pais = { nombre: 'Argentina' };
    if (ciudadano.pais) {
        ubicacion.pais.nombre = ciudadano.pais;
    }
    if (ciudadano.ciudad) {
        ubicacion.localidad.nombre = ciudadano.ciudad;
    }

    if (ciudadano.provincia) {
        ubicacion.provincia.nombre = ciudadano.provincia;
    }

    // Ver el pais de la ubicación
    domicilio.ranking = 1;
    domicilio.activo = true;
    domicilio.ubicacion = ubicacion;
    paciente.direccion.push(domicilio);

    if (ciudadano.sexo) {
        if (ciudadano.sexo === 'F') {
            paciente.sexo = 'femenino';
            paciente.genero = 'femenino';
        } else {
            paciente.sexo = 'masculino';
            paciente.genero = 'masculino';

        }
    }
    if (ciudadano.fechaNacimiento) {
        fecha = ciudadano.fechaNacimiento.split('-');
        paciente.fechaNacimiento = new Date(fecha[0].substr(0, 4), fecha[1] - 1, fecha[2]);
    }

    if (ciudadano.fallecido !== 'NO') {
        if (ciudadano.fechaFallecimiento) {
            fecha = ciudadano.fechaFallecimiento.split('-');
            paciente.fechaFallecimiento = new Date(fecha[0].substr(0, 4), fecha[1], fecha[2]);
        }
    }
    paciente.foto = ciudadano.foto;
    paciente.identificadores = [{
        entidad: 'RENAPER',
        valor: ciudadano.idciudadano
    }];
    return paciente;
}
