import { Position, Uri, workspace } from 'vscode';
import { AngularSelectorReferenceProvider } from '../AngularSelectorReferenceProvider';
import { createDocument } from '../helpers';

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

    it('should find usages of heroProp directive', async () => {
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

    it('should skip matches when they are event bindings', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument([
                '<app-hero heroProp></app-hero>',
                '<app-hero (heroProp)="onHeroChange()"></app-hero>'
            ].join('\n'))
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroProp]'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(1);
    });

    it('should find usages of complex selector', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument([
                '<app-hero heroProp></app-hero>',
                '<app-hero [heroProp]="value"></app-hero>'
            ].join('\n'))
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroProp]:not([name]):not([title])'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(2);
    });

    it('should find usages of selector with two way binding', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument([
                '<app-hero [(heroProp)]="value"></app-hero>',
                `<app-hero
                    [(heroProp)]="value"
                ></app-hero>`
            ].join('\n'))
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroProp]'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(2);
    });

    it('should find usages of multi selector', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument([
                '<app-hero heroProp></app-hero>',
                '<app-hero [heroProp]="value"></app-hero>',
                '<app-hero-prop></app-hero-prop>'
            ].join('\n'))
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroProp], app-hero-prop'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(3);
    });

    it('should find usages of multi selector when it is only one in a template', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument([
                '<app-hero heroProp></app-hero>',
                '<app-hero [heroProp]="value"></app-hero>'
            ].join('\n'))
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroProp], app-hero-prop'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(2);
    });

    it('should find usages of multi selector even if one of them is invalid', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument([
                '<app-hero heroProp></app-hero>',
                '<app-hero [heroProp]="value"></app-hero>',
                '<app-hero (heroProp)="value"></app-hero>'
            ].join('\n'))
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroProp], (heroProp)'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(2);
    });

    it('should find usages of selector when it used several times in one line', async () => {
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument([
                '<app-hero heroProp></app-hero><app-hero heroProp="value"></app-hero>',
                '<app-hero [heroProp]="value"></app-hero><app-hero [heroProp]="value"></app-hero>',
                '<app-hero *heroProp="value"></app-hero><app-hero *heroProp></app-hero>',
                '<app-hero (heroProp)="value"></app-hero><app-hero (heroProp)="value"></app-hero>'
            ].join('\n'))
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroProp], (heroProp)'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(6);
    });

    it('should work with cached textDocuments', async () => {
        workspace.textDocuments = [createDocument('<div heroProp></div>', '', 'cached.html')];
        (workspace.findFiles as jest.Mock).mockResolvedValueOnce([Uri.file('file.html'), Uri.file('cached.html')]);
        (workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(
            createDocument('<div heroProp></div>')
        );

        const actual = await provider.provideReferences(
            createDocument('', `    selector: '[heroProp]'`),
            new Position(0, 0)
        );

        expect(actual).toHaveLength(2);
    });
});
