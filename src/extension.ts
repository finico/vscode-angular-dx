import { ExtensionContext, languages } from 'vscode';
import { AngularDefinitionProvider } from './AngularDefinitionProvider';
import { AngularSelectorReferenceProvider } from './AngularSelectorReferenceProvider';

export function activate(context: ExtensionContext): void {
    context.subscriptions.push(
        languages.registerReferenceProvider(
            { language: 'typescript', scheme: 'file' },
            new AngularSelectorReferenceProvider()
        ),
        languages.registerDefinitionProvider(
            { language: 'typescript', scheme: 'file' },
            new AngularDefinitionProvider()
        )
    );
}

export function deactivate() { }
