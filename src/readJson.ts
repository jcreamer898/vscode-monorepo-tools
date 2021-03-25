import path from 'path';
import fs from 'fs';

export function readJson(filepath: string) {
    try {
        return JSON.parse(fs.readFileSync(path.resolve(filepath)).toString());
    } catch (e) {
        return null;
    }
}
