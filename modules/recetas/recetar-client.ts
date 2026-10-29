// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('request');

export const isRecetarConfigured = (): boolean => !!process.env.RECETAR_API_URL;

const baseUrl = (): string => (process.env.RECETAR_API_URL || '').replace(/\/$/, '');
const token = (): string => process.env.RECETAR_APP_TOKEN || '';

function call(method: string, path: string, payload?: any, qs?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        request({
            method,
            url: `${baseUrl()}${path}`,
            qs,
            body: payload,
            json: true,
            headers: { Authorization: `Bearer ${token()}` },
        }, (error: any, response: any, body: any) => {
            if (error) {
                return reject(error);
            }
            if (response && response.statusCode >= 400) {
                return reject(new Error(`RecetAr respondio ${response.statusCode}`));
            }
            resolve(body);
        });
    });
}

const unwrap = (body: any): any[] => (body && body.data) ? body.data : body;

export const recetarClient = {
    ingest(dataReceta: Record<string, unknown>): Promise<any> {
        return call('POST', '/modules/recetas', dataReceta);
    },

    async getRecetas(params: Record<string, unknown>): Promise<any[]> {
        return unwrap(await call('GET', '/modules/recetas/filtros', undefined, params));
    },

    async getRecetasPorPrestacion(idPrestacion: string): Promise<any[]> {
        return unwrap(await call('GET', `/modules/recetas/por-prestacion/${idPrestacion}`));
    },

    patchReceta(body: Record<string, unknown>): Promise<any> {
        return call('PATCH', '/modules/recetas', body);
    },
};
