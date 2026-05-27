import * as mongoose from 'mongoose';
import { Document, Model } from 'mongoose';

export interface ECL {
    key: string;
    nombre: string;
    valor: string;
    descripcion: string;
}

export interface ECLQueriesDocument extends ECL, Document { }

export const ECLQueriesSchema = new mongoose.Schema({
    key: String,
    nombre: String,
    valor: String,
    descripcion: String
});

export const ECLQueries = mongoose.model<ECLQueriesDocument>(
    'ECLQueries',
    ECLQueriesSchema,
    'eclqueries'
);
