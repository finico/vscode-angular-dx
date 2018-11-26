import { Range, TextDocument } from 'vscode';

export function createDocument(text = '', line = '', name = ''): TextDocument {
    return {
        fileName: name,
        lineAt: jest.fn().mockReturnValue({ text: line }),
        getText: jest.fn().mockReturnValue(text),
        getWordRangeAtPosition: jest.fn().mockReturnValue(new Range(0, 0, 0, 0)),
        positionAt: jest.fn()
    } as any;
}
