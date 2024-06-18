declare module 'rcon' {
    // Add type definitions here based on the 'rcon' module API
    // For example:
    export class Rcon {
        constructor(ip: string, port: number, password: string);
        connect(): Promise<void>;
        send(command: string): Promise<string>;
        disconnect(): void;
        // Add other methods and types used from 'rcon'
    }
}