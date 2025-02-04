"use strict";
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
exports.parseAndValidate = void 0;
const chalk_1 = __importDefault(require("chalk"));
const cli_util_1 = require("./cli-util");
const impromptu_module_1 = require("../language-server/impromptu-module");
const node_1 = require("langium/node");
const path_1 = __importDefault(require("path"));
const parseAndValidate = (fileName) => __awaiter(void 0, void 0, void 0, function* () {
    // retrieve the services for our language
    const services = (0, impromptu_module_1.createImpromptuServices)(node_1.NodeFileSystem).Impromptu;
    // extract a document for our program
    const document = yield (0, cli_util_1.extractDocument)(path_1.default.resolve('build_files/' + fileName), services);
    // extract the parse result details
    const parseResult = document.parseResult;
    // verify no lexer, parser, or general diagnostic errors show up
    if (parseResult.lexerErrors.length === 0 &&
        parseResult.parserErrors.length === 0) {
        console.log(chalk_1.default.green(`Parsed and validated ${fileName} successfully!`));
    }
    else {
        console.log(chalk_1.default.red(`Failed to parse and validate ${fileName}!`));
    }
});
exports.parseAndValidate = parseAndValidate;
//# sourceMappingURL=parse-validate.js.map