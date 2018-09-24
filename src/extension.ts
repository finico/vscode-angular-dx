import { languages, ExtensionContext } from 'vscode';
import { AngularSelectorReferenceProvider } from './AngularSelectorReferenceProvider';

export function activate(context: ExtensionContext): void {
    context.subscriptions.push(
        languages.registerReferenceProvider(
            { language: 'typescript', scheme: 'file' },
            new AngularSelectorReferenceProvider()
        )
    );
}

export function deactivate() { }
