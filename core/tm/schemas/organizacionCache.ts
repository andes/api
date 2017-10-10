import * as mongoose from 'mongoose';

let organizacionCacheSchema = new mongoose.Schema({
    anioInicioActividades: Number, // 1913
    categoriaDeLaTipologia: String, // Alto riesgo con terapia intensiva especializada
    codIndecDepto: Number, // 35
    codIndecLocalidad: Number, // 070
    codIndecProvincia: Number, // 58
    codigo: Number, // 10580352167033
    codigoSISA: Number, // 18847
    coordenadasDeMapa: {
        latitud: Number, // -38.9502472
        longitud: Number, // -68.05758879999996
        nivelZoom: Number // 14
    },
    dependencia: String, // Provincial
    depto: String, // Confluencia
    domicilio: {
        codigoPostal: Number, // 8300
        direccion: String, // BUENOS AIRES 450
    },
    fechaModificacion: String, // 21/07/2017
    fechaRegistro: String, // 28/08/2010
    imagen: {
        descripcion: String,
        imagen: String,
        titulo: String
    },
    internacion: String, // SI
    localidad: String, // 58035070 - Neuquen(Confluencia - Neuquén)
    nombre: String, // HOSPITAL PROVINCIAL NEUQUEN - DR.EDUARDO CASTRO RENDON
    origenDelFinanciamiento: String, //  Público
    participaciones: {
        erc: String, // SI
        planNacer: String, // SI
        programaMedicosComunitarios: String, // NO
        programaRemediar: String, // NO
        redDirectoresHospitales: String, //
        redEstablecimientosCCC: String, //  Ambos (tratante y referente)
        redNOMIVAC: String, // SI
        registroHPGD: String, // NO
        registroSIVILE: String, // SI
        sistemaNacionalSangre: String, // NO
        sistemaNacionalVigilanciaSalud: String, // SI
    },
    provincia: String, // Neuquen
    telefono: {
        numero: Number, // 0299-4490800
        tipo: String, // Conmutador
    },
    tipologia: String // Establecimiento de salud con internación general
}, { validateBeforeSave: true });

export let organizacionCache = mongoose.model('organizacionCache', organizacionCacheSchema, 'organizacionCache');
