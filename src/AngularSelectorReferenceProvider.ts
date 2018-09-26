import { Location, Position, ReferenceProvider, TextDocument, window, workspace } from 'vscode';

export class AngularSelectorReferenceProvider implements ReferenceProvider {
    async provideReferences(document: TextDocument, position: Position) {
        const result: Location[] = [];
        const selector = document.lineAt(position).text.match(/selector:\s*\W\[?([\w-]+)\]?/);

        if (!selector) {
            return result;
        }

        const pattern = new RegExp(`[<\\[\\s\\*](${selector[1]})[>\\]=\\s]`, 'g');
        const uris = await this.findFiles();

        for (const uri of uris) {
            try {
                const doc = await workspace.openTextDocument(uri);
                const text = doc.getText();
                let matched = null;

                while ((matched = pattern.exec(text)) !== null) {
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
