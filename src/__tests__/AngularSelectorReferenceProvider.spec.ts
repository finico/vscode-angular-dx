import { Position, Uri, window, workspace, Range, TextDocument } from 'vscode';
import { AngularSelectorReferenceProvider } from '../AngularSelectorReferenceProvider';

function createDocument(text = '', line = ''): TextDocument {
    return {
        lineAt: jest.fn().mockReturnValue({ text: line }),
        getText: jest.fn().mockReturnValue(text),
        getWordRangeAtPosition: jest.fn().mockReturnValue(new Range(0, 0, 0, 0)),
        positionAt: jest.fn()
    } as any;
}

describe('AngularSelectorReferenceProvider', () => {
    let provider: AngularSelectorReferenceProvider;

    beforeEach(() => {
        provider = new AngularSelectorReferenceProvider();
        (workspace.findFiles as jest.Mock).mockResolvedValue([Uri.file('file.html')]);
    });

    it('should return exluded files in settings', () => {
        workspace.getConfiguration('files').update('exclude', {
            '**/.git': true,
            '**/.DS_Store': true,
            '**/other': false
        });

        workspace.getConfiguration('search').update('exclude', {
            '**/node_modules': true,
            '**/bower_components': true,
            '**/other': false
        });

        expect(provider['getExcludedFilesGlob']()).toEqual(
            '{**/.git,**/.DS_Store,**/node_modules,**/bower_components}'
        );
    });

    it('should not find anything if it was called not at line with selector', async () => {
        const actual = await provider.provideReferences(
            createDocument('', 'some text'),
            new Position(0, 0)
        );

        expect(actual).toEqual([]);
    });

    it('should not find anything', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument('<div></div>')
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: 'app-hero'`),
            new Position(0, 0)
        );

        expect(actual).toEqual([]);
    });

    it('should show error message and return empty results', async () => {
        (workspace.openTextDocument as jest.Mock).mockRejectedValueOnce(
            new Error('Something went wrong')
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: 'app-hero'`),
            new Position(0, 0)
        );

        expect(actual).toEqual([]);
        expect(window.showErrorMessage).toHaveBeenCalledWith('Something went wrong');
    });

    it('should find usage of app-hero component', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument('<app-hero></app-hero>')
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: 'app-hero'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(1);
    });

    it('should find usages of app-hero-second components that used twice on one line', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument('<app-hero-second></app-hero-second><app-hero-second></app-hero-second>')
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: 'app-hero-second'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(2);
    });

    it('should find all usages of heroProp directive', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument([
                '<app-hero heroProp></app-hero>',
                '<app-hero heroProp="value"></app-hero>',
                '<app-hero [heroProp]="value"></app-hero>'
            ].join('\n'))
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroProp]'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(3);
    });

    it('should find usage of structural directive', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument([
                '<app-hero *heroStructural></app-hero>',
                '<app-hero *heroStructural="value"></app-hero>'
            ].join('\n'))
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroStructural]'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(2);
    });

    it('should skip matches if vscode could not create range for that', async () => {
        const doc = createDocument([
            '<app-hero></app-hero>',
            '<app-hero></app-hero>'
        ].join('\n'));

        (doc.getWordRangeAtPosition as jest.Mock).mockReturnValue(void 0);
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(doc);

        const actual = await provider.provideReferences(
            createDocument('', `    selector: 'app-hero'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(0);
    });
});
