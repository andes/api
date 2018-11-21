export interface IAdapter {
    name: string;
    write (stream: NodeJS.WriteStream): Promise<string>;
    read(uuid: string): Promise<NodeJS.ReadStream>;
    delete (uuid: string): Promise<void>;
}
