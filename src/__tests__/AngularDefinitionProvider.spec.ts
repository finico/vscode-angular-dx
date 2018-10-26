import * as path from 'path';
import { Location, Position, Uri } from 'vscode';
import { AngularDefinitionProvider } from '../AngularDefinitionProvider';
import { createDocument } from '../helpers';

jest.mock('path');

describe('AngularSelectorReferenceProvider', () => {
    let provider: AngularDefinitionProvider;

    beforeAll(() => {
        (path.dirname as jest.Mock).mockReturnValue('/test/path');
        (path.resolve as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

        provider = new AngularDefinitionProvider();
        provider['fileExists'] = jest.fn().mockResolvedValue(true);
    });

    it('should ignore when line at position does not have a link to a definition', async () => {
        const actual = await provider.provideDefinition(
            createDocument('', 'some text'),
            new Position(0, 0)
        );

        expect(actual).toBeNull();
    });

    it('should ignore when file does not exist', async () => {
        (provider['fileExists'] as jest.Mock).mockResolvedValueOnce(false);

        const actual = await provider.provideDefinition(
            createDocument('app.component.html', 'templateUrl: `app.component.html`'),
            new Position(0, 0)
        );

        expect(actual).toBeNull();
    });

    it('should resolve template definition', async () => {
        const actual = await provider.provideDefinition(
            createDocument('app.component.html', 'templateUrl: \'app.component.html\''),
            new Position(0, 20)
        );

        expect(actual).toEqual(new Location(Uri.file('/test/path/app.component.html'), new Position(0, 0)));
    });

    it('should resolve style definition', async () => {
        const actual = await provider.provideDefinition(
            createDocument('app.component.css', 'styleUrls: [\'app.component.css\']'),
            new Position(0, 20)
        );

        expect(actual).toEqual(new Location(Uri.file('/test/path/app.component.css'), new Position(0, 0)));
    });

    it('should resolve style definition in a multiline declaration', async () => {
        const actual = await provider.provideDefinition(
            createDocument('app.component.scss', '    \'app.component.scss,\''),
            new Position(0, 15)
        );

        expect(actual).toEqual(new Location(Uri.file('/test/path/app.component.scss'), new Position(0, 0)));
    });
});
