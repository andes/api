import { Types } from 'mongoose';
import { buscarPaciente } from '../../../core/mpi/controller/paciente';
import { getVacunas } from '../../vacunas/controller/VacunaController';
import { getPrestaciones, filtrarRegistros } from '../../rup/controllers/rup';
import { Patient, Organization, Immunization, Condition, Composition, Bundle, DocumentReference, Device } from '@andes/fhir';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { SaludDigitalClient } from '../../ips/controller/autenticacion';
import { Auth } from './../../../auth/auth.class';
import { userScheduler, hosts, FHIR } from '../../../config.private';

export async function getPaciente(cliente: SaludDigitalClient, pacienteID) {
    const { db, paciente } = await buscarPaciente(pacienteID);
    if (paciente) {
        const identificador = paciente.identificadores ? paciente.identificadores.find(i => i.entidad === SaludDigitalClient.SystemPatient) : null;
        if (!identificador) {
            const patientFhir = Patient.encode(paciente);
            delete patientFhir['photo'];
            delete patientFhir['address'];
            delete patientFhir['contact'];
            await cliente.federar(patientFhir);
            const results = await cliente.search({ identifier: `${cliente.getDominio()}|${paciente.id}` });
            if (results.length > 0) {
                const federadorPatient = results[0];
                const ident = federadorPatient.identifier.find(i => i.system === SaludDigitalClient.SystemPatient);
                if (!paciente.identificadores) {
                    paciente.identificadores = [];
                }
                paciente.identificadores.push({
                    entidad: SaludDigitalClient.SystemPatient,
                    valor: ident.value
                });
                Auth.audit(paciente, (userScheduler as any));
                await paciente.save();

                // [TODO] No repetir conceptos evolucionados!!!!
                return paciente;
            }
        }
    }
}

export async function getDocumentReference(pacienteID) {
    const { db, paciente } = await buscarPaciente(pacienteID);
    if (paciente) {
        const organizacion = await Organizacion.findOne({ 'codigo.sisa': 0 });
        const FHIRDevice = Device.encode();
        const FHIRCustodian = Organization.encode(organizacion);
        const FHIRPatient = Patient.encode(paciente);
        const binaryURL = `${hosts.main}/api/connect/fhir/Binary/${pacienteID}`;
        const documentReferenceID = String(new Types.ObjectId());

        const docRefFHIR = DocumentReference.encode(documentReferenceID, FHIRDevice, FHIRCustodian, FHIRPatient, binaryURL);

        const BundleID = String(new Types.ObjectId());
        const FHIRBundle = Bundle.encode(BundleID, [
            createResource(docRefFHIR),
            createResource(FHIRPatient),
            createResource(FHIRDevice),
            createResource(FHIRCustodian)
        ]);

        return FHIRBundle;
    }
    return null;
}

export async function IPS(pacienteID) {
    const { db, paciente } = await buscarPaciente(pacienteID);
    if (paciente) {
        // Recuperar datos de la historia clinica
        const organizacion = await Organizacion.findOne({ 'codigo.sisa': 0 });
        const prestaciones = await getPrestaciones(paciente, {});
        const semanticTags = ['trastorno', /* 'hallazgo', 'evento', 'situacion' */]; // [TODO] Revisar listado de semtags
        const registros: any = filtrarRegistros(prestaciones, { semanticTags });
        const vacunas: any = await getVacunas(paciente);

        // Armar documento
        const FHIRPatient = Patient.encode(paciente);
        const FHIRDevice = Device.encode(); // [TODO] ver que hacer
        const FHIRCustodian = Organization.encode(organizacion);

        const FHIRImmunization = vacunas.map((vacuna) => {
            return Immunization.encode(fullurl(FHIRPatient), vacuna);
        });


        const FHIRCondition = registros.map((registro) => {
            return Condition.encode(fullurl(FHIRPatient), registro);
        });

        const CompositionID = String(new Types.ObjectId());
        const FHIRComposition = Composition.encode(CompositionID, fullurl(FHIRPatient), fullurl(FHIRCustodian), fullurl(FHIRDevice), FHIRImmunization.map(fullurl), FHIRCondition.map(fullurl));

        const BundleID = String(new Types.ObjectId());
        const FHIRBundle = Bundle.encode(BundleID, [
            createResource(FHIRComposition),
            createResource(FHIRPatient),
            ...FHIRCondition.map(createResource),
            ...FHIRImmunization.map(createResource),
            createResource(FHIRDevice),
            createResource(FHIRCustodian)
        ]);

        return FHIRBundle;

    }
    return null;
}

function fullurl(resource) {
    return `${FHIR.domain}/${resource.resourceType}/${resource.id}`;
}

function createResource(resource) {
    return {
        fullUrl: fullurl(resource),
        resource
    };
}