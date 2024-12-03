"use strict";
/******************************************************************************
 * This file was generated by langium-cli 1.3.1.
 * DO NOT EDIT MANUALLY!
 ******************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isByAuthorTrait = exports.ByAuthorTrait = exports.isAudienceTrait = exports.AudienceTrait = exports.isAssetReuse = exports.AssetReuse = exports.isAssetImport = exports.AssetImport = exports.isAlternativeTrait = exports.AlternativeTrait = exports.isUnit = exports.isTrait = exports.Trait = exports.isTextTrait = exports.TextTrait = exports.isSizeConstraint = exports.isRelevance = exports.isRelativeTrait = exports.RelativeTrait = exports.isReferenciable = exports.Referenciable = exports.isQualifiedName = exports.isProximity = exports.isPointOfView = exports.isParamId = exports.isMediumIndependentTrait = exports.MediumIndependentTrait = exports.isMedium = exports.isMedia = exports.isLiteraryStyle = exports.isLighting = exports.isLanguageRegister = exports.isInputRef = exports.InputRef = exports.isInput = exports.Input = exports.isImageTrait = exports.ImageTrait = exports.isFileId = exports.isExecutableAsset = exports.ExecutableAsset = exports.isEffects = exports.isDimension = exports.isCameraSettings = exports.isCameraAngle = exports.isBaseSnippet = exports.BaseSnippet = exports.isAsset = exports.Asset = exports.ImpromptuTerminals = void 0;
exports.isParameterRef = exports.ParameterRef = exports.isParameter = exports.Parameter = exports.isNegativeTrait = exports.NegativeTrait = exports.isMultimodalRef = exports.MultimodalRef = exports.isMultimodal = exports.Multimodal = exports.isModel = exports.Model = exports.isMediumTrait = exports.MediumTrait = exports.isLiteraryStyleTrait = exports.LiteraryStyleTrait = exports.isLightingTrait = exports.LightingTrait = exports.isLanguageRegisterTrait = exports.LanguageRegisterTrait = exports.isLanguage = exports.Language = exports.isIncludesTrait = exports.IncludesTrait = exports.isImportedAsset = exports.ImportedAsset = exports.isHyperParameters = exports.HyperParameters = exports.isHyperParam = exports.HyperParam = exports.isEquivalency = exports.Equivalency = exports.isEffectsTrait = exports.EffectsTrait = exports.isCore = exports.Core = exports.isContents = exports.Contents = exports.isComposer = exports.Composer = exports.isComparisonTrait = exports.ComparisonTrait = exports.isCombinationTrait = exports.CombinationTrait = exports.isChain = exports.Chain = exports.isCameraSettingsTrait = exports.CameraSettingsTrait = exports.isCameraAngleTrait = exports.CameraAngleTrait = void 0;
exports.reflection = exports.ImpromptuAstReflection = exports.isByExpressionOutputTesting = exports.ByExpressionOutputTesting = exports.isWeight = exports.Weight = exports.isTextLiteral = exports.TextLiteral = exports.isTargetSizeTrait = exports.TargetSizeTrait = exports.isSuffix = exports.Suffix = exports.isSnippet = exports.Snippet = exports.isSimilarToTrait = exports.SimilarToTrait = exports.isProximityTrait = exports.ProximityTrait = exports.isPrompt = exports.Prompt = exports.isPrefix = exports.Prefix = exports.isPointOfViewTrait = exports.PointOfViewTrait = exports.isParamInvokation = exports.ParamInvokation = exports.isParameters = exports.Parameters = void 0;
const langium_1 = require("langium");
exports.ImpromptuTerminals = {
    WS: /\s+/,
    ID: /[_a-zA-Z][\w_]*/,
    INT: /[0-9]+/,
    STRING: /"[^"]*"|'[^']*'/,
    ML_COMMENT: /\/\*[\s\S]*?\*\//,
    SL_COMMENT: /\/\/[^\n\r]*/,
};
exports.Asset = 'Asset';
function isAsset(item) {
    return exports.reflection.isInstance(item, exports.Asset);
}
exports.isAsset = isAsset;
exports.BaseSnippet = 'BaseSnippet';
function isBaseSnippet(item) {
    return exports.reflection.isInstance(item, exports.BaseSnippet);
}
exports.isBaseSnippet = isBaseSnippet;
function isCameraAngle(item) {
    return item === 'overheadsview' || item === 'lowsangle' || item === 'aerialsview' || item === 'tiltedsframe' || item === 'over-the-shouldersshot';
}
exports.isCameraAngle = isCameraAngle;
function isCameraSettings(item) {
    return item === 'fastsshutter';
}
exports.isCameraSettings = isCameraSettings;
function isDimension(item) {
    return item === 'length' || item === 'duration' || item === 'width' || item === 'height' || item === 'depth' || item === 'count';
}
exports.isDimension = isDimension;
function isEffects(item) {
    return item === 'blur' || item === 'reflection' || item === 'distortion';
}
exports.isEffects = isEffects;
exports.ExecutableAsset = 'ExecutableAsset';
function isExecutableAsset(item) {
    return exports.reflection.isInstance(item, exports.ExecutableAsset);
}
exports.isExecutableAsset = isExecutableAsset;
function isFileId(item) {
    return typeof item === 'string';
}
exports.isFileId = isFileId;
exports.ImageTrait = 'ImageTrait';
function isImageTrait(item) {
    return exports.reflection.isInstance(item, exports.ImageTrait);
}
exports.isImageTrait = isImageTrait;
exports.Input = 'Input';
function isInput(item) {
    return exports.reflection.isInstance(item, exports.Input);
}
exports.isInput = isInput;
exports.InputRef = 'InputRef';
function isInputRef(item) {
    return exports.reflection.isInstance(item, exports.InputRef);
}
exports.isInputRef = isInputRef;
function isLanguageRegister(item) {
    return item === 'bench-level' || item === 'dialect' || item === 'facetious' || item === 'formal' || item === 'in-house' || item === 'ironic' || item === 'neutral' || item === 'slang' || item === 'taboo' || item === 'technical' || item === 'vulgar';
}
exports.isLanguageRegister = isLanguageRegister;
function isLighting(item) {
    return item === 'accent' || item === 'ambient' || item === 'atmospheric' || item === 'back' || item === 'volumetric' || item === 'diffuse' || item === 'neon' || item === 'darksshadows';
}
exports.isLighting = isLighting;
function isLiteraryStyle(item) {
    return item === 'report' || item === 'essay' || item === 'interview' || item === 'letter' || item === 'play' || item === 'poem' || item === 'song' || item === 'tale' || item === 'headline' || item === 'advertisement' || item === 'joke' || item === 'definition' || item === 'proof' || item === 'sourcescode';
}
exports.isLiteraryStyle = isLiteraryStyle;
function isMedia(item) {
    return item === 'text' || item === 'image' || item === 'audio' || item === 'video' || item === '3dobject';
}
exports.isMedia = isMedia;
function isMedium(item) {
    return item === 'photography' || item === 'drawing' || item === 'painting' || item === 'portrait' || item === 'comicsbooksart' || item === 'digitalsart' || item === '3Dsart';
}
exports.isMedium = isMedium;
exports.MediumIndependentTrait = 'MediumIndependentTrait';
function isMediumIndependentTrait(item) {
    return exports.reflection.isInstance(item, exports.MediumIndependentTrait);
}
exports.isMediumIndependentTrait = isMediumIndependentTrait;
function isParamId(item) {
    return typeof item === 'string';
}
exports.isParamId = isParamId;
function isPointOfView(item) {
    return item === 'firstsperson' || item === 'secondsperson' || item === 'thirdsperson';
}
exports.isPointOfView = isPointOfView;
function isProximity(item) {
    return item === 'extremesclose-up' || item === 'close-up' || item === 'mediumsshot' || item === 'longsshot' || item === 'extremeslongsshot';
}
exports.isProximity = isProximity;
function isQualifiedName(item) {
    return typeof item === 'string';
}
exports.isQualifiedName = isQualifiedName;
exports.Referenciable = 'Referenciable';
function isReferenciable(item) {
    return exports.reflection.isInstance(item, exports.Referenciable);
}
exports.isReferenciable = isReferenciable;
exports.RelativeTrait = 'RelativeTrait';
function isRelativeTrait(item) {
    return exports.reflection.isInstance(item, exports.RelativeTrait);
}
exports.isRelativeTrait = isRelativeTrait;
function isRelevance(item) {
    return item === 'min' || item === 'low' || item === 'medium' || item === 'high' || item === 'max';
}
exports.isRelevance = isRelevance;
function isSizeConstraint(item) {
    return item === 'exactly' || item === 'lesssthan' || item === 'moresthan' || item === 'lesssorsequalsthan' || item === 'moresorsequalsthan' || item === 'differentsfrom';
}
exports.isSizeConstraint = isSizeConstraint;
exports.TextTrait = 'TextTrait';
function isTextTrait(item) {
    return exports.reflection.isInstance(item, exports.TextTrait);
}
exports.isTextTrait = isTextTrait;
exports.Trait = 'Trait';
function isTrait(item) {
    return exports.reflection.isInstance(item, exports.Trait);
}
exports.isTrait = isTrait;
function isUnit(item) {
    return item === 'character' || item === 'word' || item === 'sentence' || item === 'line' || item === 'paragraph' || item === 'page' || item === 'second' || item === 'minute' || item === 'hour' || item === 'frame' || item === 'pixel' || item === 'point';
}
exports.isUnit = isUnit;
exports.AlternativeTrait = 'AlternativeTrait';
function isAlternativeTrait(item) {
    return exports.reflection.isInstance(item, exports.AlternativeTrait);
}
exports.isAlternativeTrait = isAlternativeTrait;
exports.AssetImport = 'AssetImport';
function isAssetImport(item) {
    return exports.reflection.isInstance(item, exports.AssetImport);
}
exports.isAssetImport = isAssetImport;
exports.AssetReuse = 'AssetReuse';
function isAssetReuse(item) {
    return exports.reflection.isInstance(item, exports.AssetReuse);
}
exports.isAssetReuse = isAssetReuse;
exports.AudienceTrait = 'AudienceTrait';
function isAudienceTrait(item) {
    return exports.reflection.isInstance(item, exports.AudienceTrait);
}
exports.isAudienceTrait = isAudienceTrait;
exports.ByAuthorTrait = 'ByAuthorTrait';
function isByAuthorTrait(item) {
    return exports.reflection.isInstance(item, exports.ByAuthorTrait);
}
exports.isByAuthorTrait = isByAuthorTrait;
exports.CameraAngleTrait = 'CameraAngleTrait';
function isCameraAngleTrait(item) {
    return exports.reflection.isInstance(item, exports.CameraAngleTrait);
}
exports.isCameraAngleTrait = isCameraAngleTrait;
exports.CameraSettingsTrait = 'CameraSettingsTrait';
function isCameraSettingsTrait(item) {
    return exports.reflection.isInstance(item, exports.CameraSettingsTrait);
}
exports.isCameraSettingsTrait = isCameraSettingsTrait;
exports.Chain = 'Chain';
function isChain(item) {
    return exports.reflection.isInstance(item, exports.Chain);
}
exports.isChain = isChain;
exports.CombinationTrait = 'CombinationTrait';
function isCombinationTrait(item) {
    return exports.reflection.isInstance(item, exports.CombinationTrait);
}
exports.isCombinationTrait = isCombinationTrait;
exports.ComparisonTrait = 'ComparisonTrait';
function isComparisonTrait(item) {
    return exports.reflection.isInstance(item, exports.ComparisonTrait);
}
exports.isComparisonTrait = isComparisonTrait;
exports.Composer = 'Composer';
function isComposer(item) {
    return exports.reflection.isInstance(item, exports.Composer);
}
exports.isComposer = isComposer;
exports.Contents = 'Contents';
function isContents(item) {
    return exports.reflection.isInstance(item, exports.Contents);
}
exports.isContents = isContents;
exports.Core = 'Core';
function isCore(item) {
    return exports.reflection.isInstance(item, exports.Core);
}
exports.isCore = isCore;
exports.EffectsTrait = 'EffectsTrait';
function isEffectsTrait(item) {
    return exports.reflection.isInstance(item, exports.EffectsTrait);
}
exports.isEffectsTrait = isEffectsTrait;
exports.Equivalency = 'Equivalency';
function isEquivalency(item) {
    return exports.reflection.isInstance(item, exports.Equivalency);
}
exports.isEquivalency = isEquivalency;
exports.HyperParam = 'HyperParam';
function isHyperParam(item) {
    return exports.reflection.isInstance(item, exports.HyperParam);
}
exports.isHyperParam = isHyperParam;
exports.HyperParameters = 'HyperParameters';
function isHyperParameters(item) {
    return exports.reflection.isInstance(item, exports.HyperParameters);
}
exports.isHyperParameters = isHyperParameters;
exports.ImportedAsset = 'ImportedAsset';
function isImportedAsset(item) {
    return exports.reflection.isInstance(item, exports.ImportedAsset);
}
exports.isImportedAsset = isImportedAsset;
exports.IncludesTrait = 'IncludesTrait';
function isIncludesTrait(item) {
    return exports.reflection.isInstance(item, exports.IncludesTrait);
}
exports.isIncludesTrait = isIncludesTrait;
exports.Language = 'Language';
function isLanguage(item) {
    return exports.reflection.isInstance(item, exports.Language);
}
exports.isLanguage = isLanguage;
exports.LanguageRegisterTrait = 'LanguageRegisterTrait';
function isLanguageRegisterTrait(item) {
    return exports.reflection.isInstance(item, exports.LanguageRegisterTrait);
}
exports.isLanguageRegisterTrait = isLanguageRegisterTrait;
exports.LightingTrait = 'LightingTrait';
function isLightingTrait(item) {
    return exports.reflection.isInstance(item, exports.LightingTrait);
}
exports.isLightingTrait = isLightingTrait;
exports.LiteraryStyleTrait = 'LiteraryStyleTrait';
function isLiteraryStyleTrait(item) {
    return exports.reflection.isInstance(item, exports.LiteraryStyleTrait);
}
exports.isLiteraryStyleTrait = isLiteraryStyleTrait;
exports.MediumTrait = 'MediumTrait';
function isMediumTrait(item) {
    return exports.reflection.isInstance(item, exports.MediumTrait);
}
exports.isMediumTrait = isMediumTrait;
exports.Model = 'Model';
function isModel(item) {
    return exports.reflection.isInstance(item, exports.Model);
}
exports.isModel = isModel;
exports.Multimodal = 'Multimodal';
function isMultimodal(item) {
    return exports.reflection.isInstance(item, exports.Multimodal);
}
exports.isMultimodal = isMultimodal;
exports.MultimodalRef = 'MultimodalRef';
function isMultimodalRef(item) {
    return exports.reflection.isInstance(item, exports.MultimodalRef);
}
exports.isMultimodalRef = isMultimodalRef;
exports.NegativeTrait = 'NegativeTrait';
function isNegativeTrait(item) {
    return exports.reflection.isInstance(item, exports.NegativeTrait);
}
exports.isNegativeTrait = isNegativeTrait;
exports.Parameter = 'Parameter';
function isParameter(item) {
    return exports.reflection.isInstance(item, exports.Parameter);
}
exports.isParameter = isParameter;
exports.ParameterRef = 'ParameterRef';
function isParameterRef(item) {
    return exports.reflection.isInstance(item, exports.ParameterRef);
}
exports.isParameterRef = isParameterRef;
exports.Parameters = 'Parameters';
function isParameters(item) {
    return exports.reflection.isInstance(item, exports.Parameters);
}
exports.isParameters = isParameters;
exports.ParamInvokation = 'ParamInvokation';
function isParamInvokation(item) {
    return exports.reflection.isInstance(item, exports.ParamInvokation);
}
exports.isParamInvokation = isParamInvokation;
exports.PointOfViewTrait = 'PointOfViewTrait';
function isPointOfViewTrait(item) {
    return exports.reflection.isInstance(item, exports.PointOfViewTrait);
}
exports.isPointOfViewTrait = isPointOfViewTrait;
exports.Prefix = 'Prefix';
function isPrefix(item) {
    return exports.reflection.isInstance(item, exports.Prefix);
}
exports.isPrefix = isPrefix;
exports.Prompt = 'Prompt';
function isPrompt(item) {
    return exports.reflection.isInstance(item, exports.Prompt);
}
exports.isPrompt = isPrompt;
exports.ProximityTrait = 'ProximityTrait';
function isProximityTrait(item) {
    return exports.reflection.isInstance(item, exports.ProximityTrait);
}
exports.isProximityTrait = isProximityTrait;
exports.SimilarToTrait = 'SimilarToTrait';
function isSimilarToTrait(item) {
    return exports.reflection.isInstance(item, exports.SimilarToTrait);
}
exports.isSimilarToTrait = isSimilarToTrait;
exports.Snippet = 'Snippet';
function isSnippet(item) {
    return exports.reflection.isInstance(item, exports.Snippet);
}
exports.isSnippet = isSnippet;
exports.Suffix = 'Suffix';
function isSuffix(item) {
    return exports.reflection.isInstance(item, exports.Suffix);
}
exports.isSuffix = isSuffix;
exports.TargetSizeTrait = 'TargetSizeTrait';
function isTargetSizeTrait(item) {
    return exports.reflection.isInstance(item, exports.TargetSizeTrait);
}
exports.isTargetSizeTrait = isTargetSizeTrait;
exports.TextLiteral = 'TextLiteral';
function isTextLiteral(item) {
    return exports.reflection.isInstance(item, exports.TextLiteral);
}
exports.isTextLiteral = isTextLiteral;
exports.Weight = 'Weight';
function isWeight(item) {
    return exports.reflection.isInstance(item, exports.Weight);
}
exports.isWeight = isWeight;
exports.ByExpressionOutputTesting = 'ByExpressionOutputTesting';
function isByExpressionOutputTesting(item) {
    return exports.reflection.isInstance(item, exports.ByExpressionOutputTesting);
}
exports.isByExpressionOutputTesting = isByExpressionOutputTesting;
class ImpromptuAstReflection extends langium_1.AbstractAstReflection {
    getAllTypes() {
        return ['AlternativeTrait', 'Asset', 'AssetImport', 'AssetReuse', 'AudienceTrait', 'BaseSnippet', 'ByAuthorTrait', 'ByExpressionOutputTesting', 'CameraAngleTrait', 'CameraSettingsTrait', 'Chain', 'CombinationTrait', 'ComparisonTrait', 'Composer', 'Contents', 'Core', 'EffectsTrait', 'Equivalency', 'ExecutableAsset', 'HyperParam', 'HyperParameters', 'ImageTrait', 'ImportedAsset', 'IncludesTrait', 'Input', 'InputRef', 'Language', 'LanguageRegisterTrait', 'LightingTrait', 'LiteraryStyleTrait', 'MediumIndependentTrait', 'MediumTrait', 'Model', 'Multimodal', 'MultimodalRef', 'NegativeTrait', 'ParamInvokation', 'Parameter', 'ParameterRef', 'Parameters', 'PointOfViewTrait', 'Prefix', 'Prompt', 'ProximityTrait', 'Referenciable', 'RelativeTrait', 'SimilarToTrait', 'Snippet', 'Suffix', 'TargetSizeTrait', 'TextLiteral', 'TextTrait', 'Trait', 'Weight'];
    }
    computeIsSubtype(subtype, supertype) {
        switch (subtype) {
            case exports.AlternativeTrait:
            case exports.CombinationTrait:
            case exports.NegativeTrait: {
                return this.isSubtype(exports.RelativeTrait, supertype);
            }
            case exports.Asset:
            case exports.AssetImport: {
                return this.isSubtype(exports.Referenciable, supertype);
            }
            case exports.AssetReuse:
            case exports.InputRef:
            case exports.TextLiteral:
            case exports.Trait: {
                return this.isSubtype(exports.BaseSnippet, supertype);
            }
            case exports.AudienceTrait:
            case exports.ByAuthorTrait:
            case exports.ComparisonTrait:
            case exports.IncludesTrait:
            case exports.RelativeTrait:
            case exports.SimilarToTrait:
            case exports.TargetSizeTrait: {
                return this.isSubtype(exports.MediumIndependentTrait, supertype);
            }
            case exports.ByExpressionOutputTesting: {
                return this.isSubtype(exports.Chain, supertype) || this.isSubtype(exports.Prompt, supertype);
            }
            case exports.CameraAngleTrait:
            case exports.CameraSettingsTrait:
            case exports.EffectsTrait:
            case exports.LightingTrait:
            case exports.MediumTrait:
            case exports.ProximityTrait: {
                return this.isSubtype(exports.ImageTrait, supertype);
            }
            case exports.Chain:
            case exports.Prompt: {
                return this.isSubtype(exports.ExecutableAsset, supertype);
            }
            case exports.Composer:
            case exports.ExecutableAsset: {
                return this.isSubtype(exports.Asset, supertype);
            }
            case exports.ImageTrait:
            case exports.MediumIndependentTrait:
            case exports.TextTrait: {
                return this.isSubtype(exports.Trait, supertype);
            }
            case exports.LanguageRegisterTrait:
            case exports.LiteraryStyleTrait:
            case exports.PointOfViewTrait: {
                return this.isSubtype(exports.TextTrait, supertype);
            }
            case exports.Multimodal:
            case exports.Parameter: {
                return this.isSubtype(exports.Input, supertype);
            }
            case exports.MultimodalRef:
            case exports.ParameterRef: {
                return this.isSubtype(exports.InputRef, supertype);
            }
            default: {
                return false;
            }
        }
    }
    getReferenceType(refInfo) {
        const referenceId = `${refInfo.container.$type}:${refInfo.property}`;
        switch (referenceId) {
            case 'AssetImport:asset':
            case 'ByExpressionOutputTesting:priorVersion':
            case 'ByExpressionOutputTesting:refines':
            case 'ByExpressionOutputTesting:priorVersion':
            case 'ByExpressionOutputTesting:refines':
            case 'Chain:priorVersion':
            case 'Chain:refines':
            case 'Composer:priorVersion':
            case 'Composer:refines':
            case 'Equivalency:assets':
            case 'Prompt:priorVersion':
            case 'Prompt:refines': {
                return exports.Asset;
            }
            case 'AssetReuse:asset': {
                return exports.Referenciable;
            }
            case 'ByExpressionOutputTesting:validator': {
                return exports.ExecutableAsset;
            }
            case 'MultimodalRef:param': {
                return exports.Multimodal;
            }
            case 'ParameterRef:param': {
                return exports.Parameter;
            }
            default: {
                throw new Error(`${referenceId} is not a valid reference id.`);
            }
        }
    }
    getTypeMetaData(type) {
        switch (type) {
            case 'AlternativeTrait': {
                return {
                    name: 'AlternativeTrait',
                    mandatory: [
                        { name: 'content', type: 'array' },
                        { name: 'contents', type: 'array' }
                    ]
                };
            }
            case 'CombinationTrait': {
                return {
                    name: 'CombinationTrait',
                    mandatory: [
                        { name: 'contents', type: 'array' }
                    ]
                };
            }
            case 'Contents': {
                return {
                    name: 'Contents',
                    mandatory: [
                        { name: 'snippets', type: 'array' }
                    ]
                };
            }
            case 'Core': {
                return {
                    name: 'Core',
                    mandatory: [
                        { name: 'snippets', type: 'array' }
                    ]
                };
            }
            case 'Equivalency': {
                return {
                    name: 'Equivalency',
                    mandatory: [
                        { name: 'assets', type: 'array' }
                    ]
                };
            }
            case 'HyperParameters': {
                return {
                    name: 'HyperParameters',
                    mandatory: [
                        { name: 'hyper', type: 'array' }
                    ]
                };
            }
            case 'ImportedAsset': {
                return {
                    name: 'ImportedAsset',
                    mandatory: [
                        { name: 'asset_name', type: 'array' }
                    ]
                };
            }
            case 'IncludesTrait': {
                return {
                    name: 'IncludesTrait',
                    mandatory: [
                        { name: 'contents', type: 'array' }
                    ]
                };
            }
            case 'Model': {
                return {
                    name: 'Model',
                    mandatory: [
                        { name: 'assets', type: 'array' },
                        { name: 'equivalencies', type: 'array' },
                        { name: 'imports', type: 'array' }
                    ]
                };
            }
            case 'Parameters': {
                return {
                    name: 'Parameters',
                    mandatory: [
                        { name: 'pars', type: 'array' }
                    ]
                };
            }
            case 'ParamInvokation': {
                return {
                    name: 'ParamInvokation',
                    mandatory: [
                        { name: 'pars', type: 'array' }
                    ]
                };
            }
            case 'Prefix': {
                return {
                    name: 'Prefix',
                    mandatory: [
                        { name: 'snippets', type: 'array' }
                    ]
                };
            }
            case 'SimilarToTrait': {
                return {
                    name: 'SimilarToTrait',
                    mandatory: [
                        { name: 'contents', type: 'array' }
                    ]
                };
            }
            case 'Suffix': {
                return {
                    name: 'Suffix',
                    mandatory: [
                        { name: 'snippets', type: 'array' }
                    ]
                };
            }
            default: {
                return {
                    name: type,
                    mandatory: []
                };
            }
        }
    }
}
exports.ImpromptuAstReflection = ImpromptuAstReflection;
exports.reflection = new ImpromptuAstReflection();
//# sourceMappingURL=ast.js.map