import { EventCore } from '@andes/event-bus';
import { getConfigHl7 } from './hl7v2-config.controller';
import { IHL7v2Config, HL7v2Config } from './hl7v2-config.schema';
import { adt04Hl7v2Log } from './hl7v2Log';
import { Auth } from '../../auth/auth.class';
import { userScheduler } from '../../config.private';
import * as mongoose from 'mongoose';
import { PacienteCtr } from '../../core-v2/mpi/paciente/paciente.routes';
import * as moment from 'moment';

const HL7V2_METADATA_KEY = 'hl7v2';
const HL7V2_CONFIG_METADATA_KEY = 'hl7v2ConfigId';
const MESSAGE_TYPE_ADT04 = 'adt04';
const IDENTIFIER_ENTITY_ANDESHL7V2 = 'ANDESHL7v2';
const SEXO_MASCULINO_HL7 = 'M';
const SEXO_FEMENINO_HL7 = 'F';
const SEXO_OTRO_HL7 = 'O';
const USE_DNI_ID = true;

// Define an interface for the identifier structure to be consistent
interface PatientIdentifier {
    identificador: string;
    assigning_authority: string;
    id_type_code: string;
}

export async function addMetadataHL7v2(prestacion: any, config: IHL7v2Config): Promise<void> {
    // Crear el array de metadatos a agregar
    const arrayMetadata = [
        { key: HL7V2_METADATA_KEY, valor: 'true' },
        { key: HL7V2_CONFIG_METADATA_KEY, valor: config.queueName }
    ];

    // Verificar si ya existe la clave 'hl7v2' en los metadatos de la prestación
    const hl7v2MetadataExists = prestacion.metadata && prestacion.metadata.some(meta => meta.key === HL7V2_METADATA_KEY);

    if (!hl7v2MetadataExists) {
        prestacion.metadata = [...(prestacion.metadata || []), ...arrayMetadata];
        try {
            Auth.audit(prestacion, userScheduler as any); // Asumiendo que userScheduler tiene el tipo correcto o que el uso de (userScheduler as any) es inevitable.
            await prestacion.save();
        } catch (error) {
            console.error('Error al guardar la prestación con metadatos HL7v2:', error);
            throw error;
        }
    }
}

export async function adt04(turno: any): Promise<void> {
    const organizacionId = turno.updatedBy.organizacion.id;
    const tipoPrestacionConceptId = turno.tipoPrestacion.conceptId;
    const idPaciente = mongoose.Types.ObjectId(turno.paciente.id);

    const paciente = await PacienteCtr.findById(idPaciente);

    const direccionInfo = paciente.direccion?.[0]; // Acceder de forma segura a la primera dirección
    const direccionCompleta = {
        direccion: direccionInfo?.valor || '',
        localidad: direccionInfo?.ubicacion?.localidad?.nombre || '',
        provincia: direccionInfo?.ubicacion?.provincia?.nombre || '',
    };

    const sexoPaciente = turno.paciente.sexo;
    const sexoHl7 = sexoPaciente === 'masculino' ? SEXO_MASCULINO_HL7 :
                    sexoPaciente === 'femenino' ? SEXO_FEMENINO_HL7 : SEXO_OTRO_HL7;

    // --- Start of HL7v2 Identifier Generation ---
    // Initialize an array to hold all identifiers
    const identifiers: PatientIdentifier[] = [];

    // 1. HL7v2 ID (from document or generated) with "HPNHL7" assigning authority
    let hl7id: string;
    if (USE_DNI_ID && turno.paciente.documento && turno.paciente.documento !== "") {
        hl7id = turno.paciente.documento;
    } else {
        const apellidoCorto = (turno.paciente.apellido || "").slice(0, 5);
        let hl7idBase = "";
        if (turno.paciente.documento) {
            hl7idBase = turno.paciente.documento;
        } else if (turno.paciente.numeroIdentificacion) {
            hl7idBase = `E${turno.paciente.numeroIdentificacion}`;
        } else {
            adt04Hl7v2Log.error(
                'adt04:no_identifier_found',
                { pacienteId: turno.paciente.id },
                'No se encontró documento o número de identificación para generar HL7v2 ID.',
                userScheduler
            );
            return;
        }
        hl7id = `${hl7idBase}${sexoHl7}${apellidoCorto}`;
    }

    identifiers.push({
        identificador: hl7id,
        assigning_authority: 'HPNHL7', // Assigning Authority for the generated HL7v2 ID
        id_type_code: 'MR' // Identifier Type Code for Medical Record
    });

    // Controlar que no lo tenga y agregarlo si es necesario (this part is for the ANDES identifier in the patient's record, not the HL7 message)
    if (!paciente.identificadores?.some(id => id.entidad === IDENTIFIER_ENTITY_ANDESHL7V2 && id.valor === hl7id)) {
        if (!paciente.identificadores) {
            paciente.identificadores = []; // Initialize if null/undefined
        }
        paciente.identificadores.push({ entidad: IDENTIFIER_ENTITY_ANDESHL7V2, valor: hl7id });
        try {
            Auth.audit(paciente, userScheduler as any);
            await paciente.save();
        } catch (saveError) {
            adt04Hl7v2Log.error(
                'adt04:paciente:save_identifier_error',
                { error: saveError.message, pacienteId: turno.paciente.id, hl7id },
                'Error guardando identificador HL7v2 en paciente.',
                userScheduler
            );
            return;
        }
    }

    // 2. idAndes: idPaciente.toHexString() with "ANDES" assigning authority and "MR"
    identifiers.push({
        // identificador: turno.paciente.documento,
        identificador: turno.paciente.id.toString(),
        assigning_authority: 'ANDES',
        id_type_code: 'MR'
    });

    // 3. documento (DNI) with "RENAPER" assigning authority and "NI" (National Identifier)
    if (turno.paciente.documento && turno.paciente.documento !== "") {
        identifiers.push({
            identificador: turno.paciente.documento,
            assigning_authority: 'RENAPER',
            id_type_code: 'NI'
        });
    }
    // --- End of HL7v2 Identifier Generation ---

    const pacienteSubconjunto: any = {
        id: turno.paciente.id, // This `id` is still relevant for other parts of your system
        nombre: turno.paciente.nombre,
        apellido: turno.paciente.apellido,
        // Removed flat hl7id, idAndes, documento
        // hl7id: hl7id,
        // idAndes: idPaciente.toHexString(),
        // documento: turno.paciente.documento,

        // NEW: Add the array of structured identifiers
        identifiers: identifiers,

        direccion: direccionCompleta.direccion,
        localidad: direccionCompleta.localidad,
        provincia: direccionCompleta.provincia,
        fechaNacimiento: turno.paciente.fechaNacimiento ? moment(turno.paciente.fechaNacimiento).format('YYYYMMDD') : '',
        sexo: sexoHl7,
        telefono: turno.paciente.telefono,
    };

    try {
        const config: IHL7v2Config = await getConfigHl7(organizacionId, tipoPrestacionConceptId, MESSAGE_TYPE_ADT04);

        if (config && config.id) { // Asegurar que config y config.id existan
            // Guardar mensaje en la cola de configuración
            await HL7v2Config.updateOne(
                { _id: config.id },
                { $push: { msgQueue: pacienteSubconjunto } }
            );
        } else {
            adt04Hl7v2Log.error(
                'adt04:config:not_found_or_inactive',
                { tipoMensaje: MESSAGE_TYPE_ADT04, organizacionId, tipoPrestacionConceptId },
                'Configuración HL7v2 no encontrada o inactiva para ADT A04.',
                userScheduler
            );
        }
    } catch (error) {
        adt04Hl7v2Log.error(
            'adt04:processing_error',
            {
                error: error.message,
                tipoMensaje: MESSAGE_TYPE_ADT04,
                pacienteId: turno.paciente.id,
                organizacionId,
                tipoPrestacionConceptId
            },
            'Error procesando ADT A04 o cargando configuración.',
            userScheduler
        );
    }
}

EventCore.on('citas:turno:asignar', async (turno) => {
    console.log(turno);
    adt04(turno).catch(error => {
        console.error(`Error no manejado en adt04 gatillado por 'citas:turno:asignar' para el turno relacionado con el paciente ${turno?.paciente?.id}:`, error);
    });
});