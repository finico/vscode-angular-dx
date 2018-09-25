import * as vscode from 'vscode';

const _config: { [index: string]: string } = {};

const languages = {
    createDiagnosticCollection: jest.fn(),
};

const StatusBarAlignment = {};

const window = {
    createStatusBarItem: jest.fn(() => ({
        show: jest.fn(),
    })),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    createTextEditorDecorationType: jest.fn(),
};

const workspace: Partial<typeof vscode.workspace> = {
    getConfiguration(section?: string) {
        return {
            has(key: string) {
                return key in _config;
            },
            get(key: string) {
                return _config[`${section}.${key}`];
            },
            update(key: string, value: any) {
                _config[`${section}.${key}`] = value;
                return Promise.resolve();
            },
            inspect: jest.fn()
        };
    },
    findFiles: jest.fn(),
    openTextDocument: jest.fn()
};

const OverviewRulerLane = {
    Left: null,
};

class Uri {
    public static parse = jest.fn();

    public static file(path: string) {
        return path;
    }
}

class Position {
    constructor(
        public readonly line: number,
        public readonly character: number
    ) { }
}

class Range {
    public readonly start: Position;
    public readonly end: Position;

    constructor(startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) {
        if ((startLineNumber > endLineNumber) || (startLineNumber === endLineNumber && startColumn > endColumn)) {
            this.start = new Position(endLineNumber, endColumn);
            this.end = new Position(startLineNumber, startColumn);
        } else {
            this.start = new Position(startLineNumber, startColumn);
            this.end = new Position(endLineNumber, endColumn);
        }
    }
}

class Location {
    constructor(
        public uri: Uri,
        public range: Range | Position
    ) { }
}

const commands = {
    executeCommand: jest.fn(),
};

export {
    languages,
    StatusBarAlignment,
    window,
    workspace,
    OverviewRulerLane,
    Uri,
    Position,
    Range,
    Location,
    commands,
};
