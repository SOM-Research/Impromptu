"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const node_1 = require("vscode-languageclient/node");
const impromptu_code_generator_1 = require("./impromptu-code-generator");
const generate_prompt_1 = require("./cli/generate-prompt");
const fs_1 = __importDefault(require("fs"));
let client;
let previewPanel;
/**
 * This function is called when the extension is activated.
 * */
function activate(context) {
    //@ts-ignore
    global.VSMODE = true;
    //@ts-ignore
    client = startLanguageClient(context);
    context.subscriptions.push(vscode.commands.registerCommand('impromptu.generateChatGPT', () => __awaiter(this, void 0, void 0, function* () {
        yield generateCodeService(context, generate_prompt_1.AISystem.ChatGPT);
    })));
    context.subscriptions.push(vscode.commands.registerCommand('impromptu.generateStableDiffusion', () => __awaiter(this, void 0, void 0, function* () {
        yield generateCodeService(context, generate_prompt_1.AISystem.StableDiffusion);
    })));
    context.subscriptions.push(vscode.commands.registerCommand('impromptu.saveCodeDocument', () => __awaiter(this, void 0, void 0, function* () {
        yield saveCodeDocument(context);
    })));
}
exports.activate = activate;
/**
 * This function is called when the extension is deactivated.
 * */
function deactivate() {
    if (client) {
        return client.stop();
    }
    return undefined;
}
exports.deactivate = deactivate;
function startLanguageClient(context) {
    const serverModule = context.asAbsolutePath(path.join('out', 'language-server', 'main'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] };
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: { module: serverModule, transport: node_1.TransportKind.ipc, options: debugOptions }
    };
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.prm');
    context.subscriptions.push(fileSystemWatcher);
    // Options to control the language client
    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'impromptu' }],
        synchronize: {
            // Notify the server about file changes to files contained in the workspace
            fileEvents: fileSystemWatcher
        }
    };
    // Create the language client and start the client.
    const client = new node_1.LanguageClient('impromptu', 'Impromptu', serverOptions, clientOptions);
    // Start the client. This will also launch the server
    client.start();
    return client;
}
/**
 * Service of the extention that enables the generation of the code file.
 * @param context
 * @param aiSystem
 */
function generateCodeService(context, aiSystem) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const generator = new impromptu_code_generator_1.CodeGenerator(context);
        const model = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.getText();
        if (model) {
            var prompt = yield requestPromptAndValidation(generator, model);
            if (prompt) {
                /**
                 * code that generates the prompt
                 */
                const returner = generator.generateCode(model, aiSystem, prompt);
                let title = 'Code Test Scenario';
                /**
                 * webview panel
                 */
                previewPanel = vscode.window.createWebviewPanel(
                // Webview id
                'liveCodePreviewer', 
                // Webview title
                title, 
                // This will open the second column for preview inside editor
                2, {
                    // Enable scripts in the webview
                    enableScripts: false,
                    retainContextWhenHidden: false,
                    // And restrict the webview to only loading content from our extension's 'assets' directory. -> PROBLEM WITH IMPORTS
                    localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'assets'))]
                });
                setPreviewActiveContext('liveCodePreviewer', true);
                updateCodePreview(returner);
                previewPanel.onDidDispose(() => {
                    setPreviewActiveContext('liveCodePreviewer', false);
                });
            }
        }
    });
}
/**
 * Select the prompt it wants to be generated + validated
 * @param generator
 * @param model .prm flie selected
 * @returns
 */
function requestPromptAndValidation(generator, model) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompts = generator.getPromptsList(model);
        if (prompts) {
            var quickPickItems = new Array();
            prompts.forEach(prompt => {
                if (prompt)
                    quickPickItems.push({ label: prompt.name, description: prompt.description });
            });
            if (quickPickItems && quickPickItems.length > 1) { // The file has more than one asset -> one should be selected
                const pick = yield vscode.window.showQuickPick(quickPickItems, {
                    placeHolder: 'Select which prompt do you want to query the model with.',
                    canPickMany: false
                });
                return pick === null || pick === void 0 ? void 0 : pick.label;
            }
            if (quickPickItems && quickPickItems.length == 1)
                return quickPickItems[0].label;
        }
        return undefined;
    });
}
/**
 * Visualize a text in the panel webview
 *
 * @param code text to be visualized
 */
function updateCodePreview(code) {
    if (previewPanel && code) {
        previewPanel.webview.html = code;
    }
}
function setPreviewActiveContext(panelName, value) {
    vscode.commands.executeCommand('setContext', panelName, value);
}
function saveCodeDocument(context) {
    var _a;
    const code = previewPanel.webview.html;
    const searchRegExp = /\s/g;
    const replaceWith = '-';
    const title = previewPanel.title.toLowerCase().replace(searchRegExp, replaceWith);
    if (code) {
        (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a.forEach(workspace => {
            const filePath = workspace.uri.fsPath + "/" + title + ".py";
            fs_1.default.writeFileSync(filePath, code, 'utf8');
            vscode.window.showInformationMessage('Congrats! Your file, ' + title + '.py, has been saved in your workspace root folder.');
        });
    }
}
//# sourceMappingURL=extension.js.map