import { readFile } from 'fs';
import { EOL } from 'os';
import { promisify } from 'util';
import { Location, Position, Range, ReferenceProvider, TextDocument, Uri, window, workspace } from 'vscode';

export class AngularSelectorReferenceProvider implements ReferenceProvider {
    private readFile = promisify(readFile);

    async provideReferences(document: TextDocument, position: Position) {
        const matched = document.lineAt(position).text.match(/selector:\s*\W\[?([\w-]+)\]?/);
        const matches: Location[] = [];

        if (!matched) {
            return matches;
        }

        const pattern = new RegExp(`[<\\[\\s\\*](${matched[1]})[>\\]=\\s]`, 'g');
        const uris = await this.findFiles();

        for (const uri of uris) {
            try {
                const buffer = await this.readFile(uri.path);
                const res = this.parse(buffer.toString(), pattern, uri);

                if (res.length) {
                    matches.push(...res);
                }
            } catch (e) {
                window.showErrorMessage((e as Error).message);
            }
        }

        return matches;
    }

    private parse(text: string, pattern: RegExp, uri: Uri) {
        const matches = [];
        const lines = text.split(EOL);

        for (let ln = 0; ln < lines.length; ln++) {
            const lineText = lines[ln];
            let matched = null;

            while ((matched = pattern.exec(lineText)) !== null) {
                const { index } = matched;

                matches.push(new Location(uri, new Range(ln, index + 1, ln, index + 1 + matched[1].length)));
            }
        }

        return matches;
    }

    private findFiles() {
        const exclude = this.getExcludedFilesGlob();

        return workspace.findFiles('**/*.html', exclude);
    }

    private getExcludedFilesGlob() {
        const settingsExclude: { [index: string]: string[] } = {
            ...workspace.getConfiguration('files', null).get('exclude'),
            ...workspace.getConfiguration('search', null).get('exclude')
        };

        return '{' + Object.keys(settingsExclude).filter(key => settingsExclude[key]).join(',') + '}';
    }
}
