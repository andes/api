import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Writable } from 'stream';
import { Types } from 'mongoose';

const mockPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

const mockUploadState = {
    chunks: [] as Buffer[],
    id: new Types.ObjectId()
};

jest.mock('./hudsFiles', () => ({
    getHUDSExportarModel: () => ({
        openUploadStream: () => {
            const stream: any = new Writable({
                write(chunk, encoding, callback) {
                    mockUploadState.chunks.push(Buffer.from(chunk));
                    callback();
                }
            });
            stream.id = mockUploadState.id;
            return stream;
        }
    }),
    readFile: jest.fn()
}));

jest.mock('./exportHuds.schema', () => {
    const peticion = {
        _id: 'export-id',
        pacienteId: 'paciente-id',
        pacienteNombre: 'Paciente Test',
        prestaciones: ['prestacion-1', 'prestacion-2'],
        excluye: [],
        status: 'pending',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        user: { usuario: { id: 'u1', nombre: 'User' }, organizacion: 'org' },
        save: jest.fn().mockResolvedValue(true)
    };
    return {
        ExportHudsModel: {
            findById: jest.fn().mockResolvedValue(peticion)
        }
    };
});

jest.mock('../../rup/schemas/prestacion', () => ({
    Prestacion: {
        find: jest.fn().mockResolvedValue([
            {
                id: 'prestacion-1',
                paciente: { documento: '12345678' },
                solicitud: { fecha: new Date('2025-01-01'), tipoPrestacion: { term: 'Consulta' } }
            },
            {
                id: 'prestacion-2',
                paciente: { documento: '12345678' },
                solicitud: { fecha: new Date('2025-01-02'), tipoPrestacion: { term: 'Control' } }
            }
        ])
    }
}));

jest.mock('../../descargas/informe-rup/informe-rup', () => ({
    InformeRUP: class {
        async informe() {
            return Buffer.from(mockPdf);
        }
    }
}));

jest.mock('../../descargas/informe-cda/informe-cda', () => ({
    InformeCDA: class {
        async informe() {
            return Buffer.from(mockPdf);
        }
    }
}));

jest.mock('../../cda/controller/CDAPatient', () => ({
    cdaToJSON: jest.fn(),
    getCdaAdjunto: jest.fn()
}));

jest.mock('../../cda/schemas/CDAFiles', () => ({
    makeFs: jest.fn()
}));

jest.mock('../../../core-v2/mpi', () => ({
    Paciente: { findById: jest.fn() }
}));

jest.mock('./exportHuds.log', () => ({
    exportHudsLog: { info: jest.fn(), error: jest.fn() }
}));

import { createFile } from './exportHuds.controller';

describe('exportHuds - armado del ZIP', () => {
    it('genera un zip válido con todos los PDFs', async () => {
        mockUploadState.chunks = [];

        await createFile('export-id');

        const zip = Buffer.concat(mockUploadState.chunks);
        expect(zip.length).toBeGreaterThan(0);

        const tmpFile = path.join(os.tmpdir(), `huds-export-${Date.now()}.zip`);
        fs.writeFileSync(tmpFile, zip);

        try {
            execFileSync('unzip', ['-t', tmpFile]);

            const entries = execFileSync('unzip', ['-Z1', tmpFile])
                .toString()
                .split('\n')
                .filter(name => name.trim().length > 0);

            expect(entries).toHaveLength(2);
            expect(entries.every(name => name.endsWith('.pdf'))).toBe(true);
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });
});
