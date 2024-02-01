import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from 'vscode-languageclient/node';
import { CodeGenerator } from './impromptu-code-generator';
import fs from 'fs';

let client: LanguageClient;

let previewPanel : vscode.WebviewPanel;

// This function is called when the extension is activated.
export function activate(context: vscode.ExtensionContext): void {
    client = startLanguageClient(context);
    context.subscriptions.push(vscode.commands.registerCommand('impromptu.generateChatGPT', async () => {
        await generateChatGPTService(context);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('impromptu.saveCodeDocument', async () => {
        await saveCodeDocument(context);
     }));
}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    if (client) {
        return client.stop();
    }
    return undefined;
}

function startLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join('out', 'language-server', 'main'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.prm');
    context.subscriptions.push(fileSystemWatcher);

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'impromptu' }],
        synchronize: {
            // Notify the server about file changes to files contained in the workspace
            fileEvents: fileSystemWatcher
        }
    };

    // Create the language client and start the client.
    const client = new LanguageClient(
        'impromptu',
        'Impromptu',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
    return client;
}

async function generateChatGPTService(context: vscode.ExtensionContext) {
    let title : string = 'Code Test Scenario';
    previewPanel = vscode.window.createWebviewPanel(
        // Webview id
        'liveCodePreviewer',
        // Webview title
        title,
        // This will open the second column for preview inside editor
        2,
        {
            // Enable scripts in the webview
            enableScripts: false,
            retainContextWhenHidden: false,
            // And restrict the webview to only loading content from our extension's 'assets' directory.
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'assets'))]
        }
    )
    setPreviewActiveContext(true);
    const generator =  new CodeGenerator(context);
    const prompt = vscode.window.activeTextEditor?.document.getText();
    if (prompt) {
        const returner = generator.generateChatGPT(prompt);
        updateCodePreview(returner);
        console.log(returner);
    }
    previewPanel.onDidDispose(() => {
        setPreviewActiveContext(false);
    })
}

function updateCodePreview(code : string | void) {
    if (previewPanel && code) {
        previewPanel.webview.html = code;
    }
}

function setPreviewActiveContext(value: boolean) {
    vscode.commands.executeCommand('setContext', 'liveCodePreviewer', value);
}

function saveCodeDocument(context: vscode.ExtensionContext) {
    const code = previewPanel.webview.html;
    const searchRegExp = /\s/g;
    const replaceWith = '-';
    const title = previewPanel.title.toLowerCase().replace(searchRegExp, replaceWith);
    if (code) {
        vscode.workspace.workspaceFolders?.forEach(workspace => {
            const filePath = workspace.uri.fsPath + "/" + title + ".py";
            fs.writeFileSync(filePath, code, 'utf8');
		    vscode.window.showInformationMessage('Congrats! Your file, ' + title + '.py, has been saved in your workspace root folder.');
        });
    }
}
