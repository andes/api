import * as asyncHandler from 'express-async-handler';
import { Request as ERequest, Response as EResponse, Router } from 'express';


export function apiOptions(req: ERequest): IOptions {
    const options: IOptions = {};
    options.fields = req.query.fields;
    options.limit = req.query.fields ? parseInt(req.query.limit, 2) : 50;
    options.skip = req.query.skip ? parseInt(req.query.skip, 2) : null;
    return options;
}

export {
    asyncHandler,
    Router
};

export interface IOptions {
    fields?: string;
    skip?: number;
    limit?: number;
}

export interface Request extends ERequest {
    apiOptions(): IOptions;
    resources: any;
}

export interface Response extends EResponse {

}
