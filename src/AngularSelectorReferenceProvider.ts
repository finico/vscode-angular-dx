import { readFile } from 'fs';
import { promisify } from 'util';
import { Location, Position, ReferenceProvider, TextDocument, window, workspace } from 'vscode';

export class AngularSelectorReferenceProvider implements ReferenceProvider {
    private readFile = promisify(readFile);

    async provideReferences(document: TextDocument, position: Position) {
        const result: Location[] = [];
        const selectorMatch = document.lineAt(position).text.match(/selector *: *\W(\[?[\w-]+\]?)/);

        if (!selectorMatch) {
            return result;
        }

        const selector = selectorMatch[1];
        const pattern = selector[0] === '[' ?
            `[ \\t\\[\\*](${selector.slice(1, -1)})[ =>\\]\\/\\n]` :
            `<(${selector})[ >\\/\\n]`;
        const regex = new RegExp(pattern, 'g');
        const uris = await this.findFiles();

        for (const uri of uris) {
            try {
                const rawFileBuffer = await this.readFile(uri.fsPath);
                const doc = await workspace.openTextDocument({ content: rawFileBuffer.toString() });
                const text = doc.getText();
                let matched = null;

                while ((matched = regex.exec(text)) !== null) {
                    const range = doc.getWordRangeAtPosition(doc.positionAt(matched.index + 1));

                    if (range) {
                        result.push(new Location(uri, range));
                    }
                }
            } catch (e) {
                window.showErrorMessage((e as Error).message);
            }
        }

        return result;
    }

    private findFiles() {
        const exclude = this.getExcludedFilesGlob();

        return workspace.findFiles('**/*.html', exclude);
    }

    private getExcludedFilesGlob() {
        const settingsExclude: { [index: string]: boolean } = {
            ...workspace.getConfiguration('files', null).get('exclude'),
            ...workspace.getConfiguration('search', null).get('exclude')
        };

        return '{' + Object.keys(settingsExclude).filter(key => settingsExclude[key]).join(',') + '}';
    }
}
