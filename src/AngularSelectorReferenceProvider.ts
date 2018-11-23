import { Location, Position, ReferenceProvider, TextDocument, Uri, workspace } from 'vscode';

export class AngularSelectorReferenceProvider implements ReferenceProvider {
    async provideReferences(document: TextDocument, position: Position): Promise<Location[]> {
        const selectorMatch = document.lineAt(position).text.match(/selector\s*:\s*['"`](.+)['"`]/);

        if (!selectorMatch) {
            return [];
        }

        const pattern = this.buildPattern(selectorMatch[1]);
        const uris = await this.findFiles();
        const locations = await this.processUris(uris, pattern);

        return locations;
    }

    private async processUris(uris: Uri[], regex: RegExp): Promise<Location[]> {
        const result: Location[] = [];
        const wordRegex = /[\w-]+/;
        const cache = new Map();

        for (const textDocument of workspace.textDocuments) {
            cache.set(textDocument.fileName, textDocument);
        }

        for (const uri of uris) {
            const doc = cache.get(uri.fsPath) || await workspace.openTextDocument(uri);
            const text = doc.getText();
            let matched = null;

            while ((matched = regex.exec(text))) {
                const position = doc.positionAt(matched.index + 1);
                const range = doc.getWordRangeAtPosition(position, wordRegex);

                if (range) {
                    result.push(new Location(doc.uri, range));
                }
            }
        }

        return result;
    }

    /*
    Although, it won't works as document.querySelector()
    All things like `:not()` will be ignored
    */
    private buildPattern(selector: string): RegExp {
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

        return new RegExp(result, 'g');
    }

    private findFiles(): Thenable<Uri[]> {
        const exclude = this.getExcludedFilesGlob();

        return workspace.findFiles('**/*.html', exclude);
    }

    private getExcludedFilesGlob(): string {
        const settingsExclude: { [index: string]: boolean } = {
            ...workspace.getConfiguration('files', null).get('exclude'),
            ...workspace.getConfiguration('search', null).get('exclude')
        };

        return '{' + Object.keys(settingsExclude).filter(key => settingsExclude[key]).join(',') + '}';
    }
}
