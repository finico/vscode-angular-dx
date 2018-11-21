import { readFile } from 'fs';
import { promisify } from 'util';
import { Location, Position, ReferenceProvider, TextDocument, window, workspace } from 'vscode';

export class AngularSelectorReferenceProvider implements ReferenceProvider {
    private readFile = promisify(readFile);

    async provideReferences(document: TextDocument, position: Position) {
        const result: Location[] = [];
        const selectorMatch = document.lineAt(position).text.match(/selector\s*:\s*['"`](.+)['"`]/);

        if (!selectorMatch) {
            return result;
        }

        const pattern = this.buildPattern(selectorMatch[1]);
        const regex = new RegExp(pattern, 'g');
        const uris = await this.findFiles();

        for (const uri of uris) {
            try {
                const rawFileBuffer = await this.readFile(uri.fsPath);
                const doc = await workspace.openTextDocument({
                    content: rawFileBuffer.toString(),
                    language: undefined
                });
                const text = doc.getText();
                let matched = null;

                while ((matched = regex.exec(text)) !== null) {
                    const range = doc.getWordRangeAtPosition(doc.positionAt(matched.index + 1), /[\w-]+/);

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

    /*
    Although, it won't works as document.querySelector()
    All things like `:not()` will be ignored
    */
    private buildPattern(selector: string): string {
        const selectorRegex = /^\s*(\[?)([\w-]+)(\]?)/;
        const parts = selector.split(',');
        let result = '';

        for (const part of parts) {
            const partMatch = part.match(selectorRegex);

            if (!partMatch) {
                continue;
            }

            const pattern = partMatch[1] ?
                `(\\s|\\[|\\[\\(|\\*)(${partMatch[2]})[=>\\)\\]\\/\\s]` :
                `<(${partMatch[2]})[>\\/\\s]`;

            result += result ? '|' + pattern : pattern;
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
