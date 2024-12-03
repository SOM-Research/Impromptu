import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from 'vscode-languageclient/node';
import { CodeGenerator } from './impromptu-code-generator';
import { AISystem } from './cli/generate-prompt';
import fs from 'fs';

let client: LanguageClient;

let previewPanel : vscode.WebviewPanel;

/** 
 * This function is called when the extension is activated.
 * */
export function activate(context: vscode.ExtensionContext): void {
    
    //@ts-ignore
    global.VSMODE = true;
    //@ts-ignore
    client = startLanguageClient(context);
    
    context.subscriptions.push(vscode.commands.registerCommand('impromptu.generateChatGPT', async () => {
        await generateCodeService(context, AISystem.ChatGPT);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('impromptu.generateStableDiffusion', async () => {
        await generateCodeService(context, AISystem.StableDiffusion);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('impromptu.saveCodeDocument', async () => {
        await saveCodeDocument(context);
     }));
}

/** 
 * This function is called when the extension is deactivated.
 * */
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

/**
 * Service of the extention that enables the generation of the code file.
 * @param context 
 * @param aiSystem 
 */
async function generateCodeService(context: vscode.ExtensionContext, aiSystem: string) {

    const generator =  new CodeGenerator(context);
    const model = vscode.window.activeTextEditor?.document.getText();
    if (model) {
        var prompt = await requestPromptAndValidation(generator, model);
        if (prompt) {
            /**
             * code that generates the prompt
             */
            const returner = generator.generateCode(model, aiSystem, prompt);
            let title : string = 'Code Test Scenario';

            /**
             * webview panel
             */
            
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
                    // And restrict the webview to only loading content from our extension's 'assets' directory. -> PROBLEM WITH IMPORTS
                    localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'assets'))]
                }
            )
            setPreviewActiveContext('liveCodePreviewer', true);
            updateCodePreview(returner);
            previewPanel.onDidDispose(() => {
                setPreviewActiveContext('liveCodePreviewer', false);
            })
        }
    }
}

/**
 * Select the prompt it wants to be generated + validate it 
 * @param generator 
 * @param model .prm flie selected 
 * @returns 
 */
async function requestPromptAndValidation(generator: CodeGenerator, model: string) {
    const prompts = generator.getPromptsList(model);
    if (prompts) {
        var quickPickItems = new Array();
        prompts.forEach(prompt => {
            if (prompt) quickPickItems.push({label: prompt.name, description: prompt.description})
        });
        if (quickPickItems && quickPickItems.length > 1) { // The file has more than one asset -> one should be selected
            const pick = await vscode.window.showQuickPick(
                quickPickItems,
                {
                    placeHolder: 'Select which prompt do you want to query the model with.',
                    canPickMany: false
                });
            return pick?.label;
        }
        if (quickPickItems && quickPickItems.length == 1)
            return quickPickItems[0].label;
    }
    return undefined;
}

/**
 * Visualize a text in the panel webview
 * 
 * @param code text to be visualized
 */
function updateCodePreview(code : string | void) {
    if (previewPanel && code) {
        previewPanel.webview.html = code;
    }
}

function setPreviewActiveContext(panelName: string, value: boolean) {
    vscode.commands.executeCommand('setContext', panelName, value);
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
