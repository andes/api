import { WebHook } from '../schemas/webhookSchema';


export async function update(id, data, req) {
    const buscado = await WebHook.findById(id);
    if (buscado) {
        buscado.set(data);
        return await buscado.save();
    }
    return null;
}

export async function remove(id) {
    const buscado = await WebHook.findById(id);
    if (buscado) {
        return await buscado.remove();
    }
    return null;
}

export async function create(data, req) {
    const plantilla = await WebHook.insertMany(data);
    return plantilla;
}

