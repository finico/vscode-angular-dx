import { Position, Uri, window, workspace } from 'vscode';
import { AngularSelectorReferenceProvider } from '../AngularSelectorReferenceProvider';

describe('AngularSelectorReferenceProvider', () => {
    let provider: AngularSelectorReferenceProvider;
    const doc = {
        lineAt: jest.fn()
    };

    beforeEach(() => {
        provider = new AngularSelectorReferenceProvider();
        (workspace.findFiles as jest.Mock).mockReturnValue(Promise.resolve([Uri.file('file.html')]));
        provider['readFile'] = jest.fn();
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
        doc.lineAt.mockReturnValueOnce({ text: 'some text' });

        const actual = await provider.provideReferences(doc as any, new Position(1, 1));

        expect(actual).toEqual([]);
    });

    it('should not find anything', async () => {
        doc.lineAt.mockReturnValueOnce({
            text: [
                `import { Component } from '@angular/core';`,
                `@Component({`,
                `    selector: 'app-hero'`,
                `})`,
                `export class Hero {}`
            ].join('\n')
        });
        (provider['readFile'] as jest.Mock).mockReturnValueOnce(Promise.resolve('<div></div>'));

        const actual = await provider.provideReferences(doc as any, new Position(1, 1));

        expect(actual).toEqual([]);
    });

    it('should show error message and return empty results', async () => {
        doc.lineAt.mockReturnValueOnce({
            text: [
                `import { Component } from '@angular/core';`,
                `@Component({`,
                `    selector: 'app-hero'`,
                `})`,
                `export class Hero {}`
            ].join('\n')
        });
        (provider['readFile'] as jest.Mock).mockRejectedValueOnce(new Error('Something went wrong'));

        const actual = await provider.provideReferences(doc as any, new Position(3, 20));

        expect(actual).toEqual([]);
        expect(window.showErrorMessage).toHaveBeenCalledWith('Something went wrong');
    });

    it('should find usage of app-hero component', async () => {
        doc.lineAt.mockReturnValueOnce({
            text: [
                `import { Component } from '@angular/core';`,
                `@Component({`,
                `    selector: 'app-hero'`,
                `})`,
                `export class Hero {}`
            ].join('\n')
        });
        (provider['readFile'] as jest.Mock).mockReturnValueOnce(Promise.resolve(
            '<app-hero></app-hero>'
        ));

        const actual = await provider.provideReferences(doc as any, new Position(3, 20));

        expect(actual).toHaveLength(1);

        const [first] = actual;

        expect(first.range.start).toEqual(new Position(0, 1));
        expect(first.range.end).toEqual(new Position(0, 9));
    });

    it('should find usages of app-hero-second components that used twice on one line', async () => {
        doc.lineAt.mockReturnValueOnce({
            text: [
                `import { Component } from '@angular/core';`,
                `@Component({`,
                `    selector: 'app-hero-second'`,
                `})`,
                `export class Hero {}`
            ].join('\n')
        });
        (provider['readFile'] as jest.Mock).mockReturnValueOnce(Promise.resolve(
            '<app-hero-second></app-hero-second><app-hero-second></app-hero-second>'
        ));

        const actual = await provider.provideReferences(doc as any, new Position(3, 20));

        expect(actual).toHaveLength(2);

        const [first, second] = actual;

        expect(first.range.start).toEqual(new Position(0, 1));
        expect(first.range.end).toEqual(new Position(0, 16));

        expect(second.range.start).toEqual(new Position(0, 36));
        expect(second.range.end).toEqual(new Position(0, 51));
    });

    it('should find all usages of heroProp directive', async () => {
        doc.lineAt.mockReturnValueOnce({
            text: [
                `import { Directive } from '@angular/core';`,
                `@Directive({`,
                `    selector: '[heroProp]'`,
                `})`,
                `export class HeroProp {}`
            ].join('\n')
        });
        (provider['readFile'] as jest.Mock).mockReturnValueOnce(Promise.resolve([
            '<app-hero heroProp></app-hero>',
            '<app-hero heroProp="value"></app-hero>',
            '<app-hero [heroProp]="value"></app-hero>'
        ].join('\n')));

        const actual = await provider.provideReferences(doc as any, new Position(3, 20));

        expect(actual).toHaveLength(3);

        const [first, second, third] = actual;

        expect(first.range.start).toEqual(new Position(0, 10));
        expect(first.range.end).toEqual(new Position(0, 18));

        expect(second.range.start).toEqual(new Position(1, 10));
        expect(second.range.end).toEqual(new Position(1, 18));

        expect(third.range.start).toEqual(new Position(2, 11));
        expect(third.range.end).toEqual(new Position(2, 19));
    });

    it('should find usage of structural directive', async () => {
        doc.lineAt.mockReturnValueOnce({
            text: [
                `import { Directive } from '@angular/core';`,
                `@Directive({`,
                `    selector: '[heroStructural]'`,
                `})`,
                `export class HeroProp {}`
            ].join('\n')
        });
        (provider['readFile'] as jest.Mock).mockReturnValueOnce(Promise.resolve([
            '<app-hero *heroStructural></app-hero>',
            '<app-hero *heroStructural="value"></app-hero>'
        ].join('\n')));

        const actual = await provider.provideReferences(doc as any, new Position(3, 20));

        expect(actual).toHaveLength(2);
    });
});
