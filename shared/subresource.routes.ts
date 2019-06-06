import { Router, Response } from 'express';

export class SubresourceRoutes {
    resourceName: string;
    subresourceName: string;
    controllerSubresource;
    router = Router();

    constructor(controller) {
        this.controllerSubresource = controller;
        this.getRoutes();
    }

    get = async (req, res: Response, next) => {
    }

    async save(resource, req) {
    }

    /**
    * @api {get} /resource/:idResource/subresources
    * @apiName get
    * @apiGroup MPI
    *
    * @apiSuccess {Array} Listado
    */

    findSubresources = (req, res: Response) => {
        let resource = req[this.resourceName];
        let lista = this.controllerSubresource.find(resource, req.query);
        return res.json(lista);
    }

    /**
    * @api {get} /resource/:idResource/subresources/:idSubresource
    * @apiName getSubresource
    * @apiGroup MPI
    *
    * @apiSuccess {ISubresource} Subresource.
    */

    getSubresources = async (req, res: Response) => {
        let resource = req[this.resourceName];
        const lista = this.controllerSubresource.find(resource, req.query);
        return res.json(lista);
    }

    /**
    * @api {post} /resource/:idResource/subresources Creación de un nuevo subresource
    * @apiName post
    * @apiGroup MPI
    *
    */

    post = async (req, res: Response) => {
        let resource = req[this.resourceName];
        const elemento = this.controllerSubresource.store(resource, req.body);
        const resource_up = resource[this.subresourceName].push(elemento);
        const resource_update = await this.save(resource_up, req);
        let subresources = [];
        subresources = resource_update[this.resourceName];
        if (resource_update) {
            return res.json(subresources[subresources.length - 1]);
        } else {
            return 400;
        }
    }

    /**
    * @api {patch} /resource/:idResource/subresources/:idSubResource Modifica un subrecurso
    * @apiName patch
    * @apiGroup MPI
    *
    */

    public patch = async (req, res: Response) => {
        let resource = req[this.resourceName];
        let subresource = this.controllerSubresource.findById(resource, req.params.id);
        if (subresource) {
            subresource = this.controllerSubresource.update(resource, subresource, req.body);
            let subresources = resource[this.subresourceName].filter(c => { return c.id !== req.params.id; });
            subresources = subresources.push(subresource);
            let resource_update = req[this.resourceName];
            resource_update[this.subresourceName] = subresources;
            await this.save(resource_update, req);
        }
        res.json(subresource);
    }

    /**
    * @api {delete} /pacientes/:idPaciente/contactos/:idSubResource Elimina un subrecurso de un paciente
    * @apiName delete
    * @apiGroup MPI
    *
    * @apiSuccess
    */

    public delete = async (req, res: Response) => {
        let resource = req[this.resourceName];
        const subresource = this.controllerSubresource.findById(resource, req.params.id);
        if (subresource) {
            const subresource_update = this.controllerSubresource.deleteContacto(resource, subresource);
            resource[this.subresourceName] = subresource_update;
            await this.save(resource, req);
        }
        res.json(subresource);
    }

    getRoutes() {

    }


}
