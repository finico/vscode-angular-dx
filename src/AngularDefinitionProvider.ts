import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { DefinitionProvider, Location, Position, TextDocument, Uri } from 'vscode';

export class AngularDefinitionProvider implements DefinitionProvider {
    private fileExists = promisify(fs.exists);

    async provideDefinition(document: TextDocument, position: Position) {
        const fileName = document.getText(document.getWordRangeAtPosition(position, /([\w\.\/\-]+)/i));

        if (!fileName || !fileName.match(/\.(html|s?css|less),?$/)) {
            return null;
        }

        const filePath = path.resolve(path.dirname(document.fileName), fileName);
        const exists = await this.fileExists(filePath);

        return exists ? new Location(Uri.file(filePath), new Position(0, 0)) : null;
    }
}
