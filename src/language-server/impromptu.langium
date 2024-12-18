grammar Impromptu

// Identifiers
QualifiedName returns string: ID ('.' ID)*;
ParamId returns string:'@'+ID;
FileId returns string:'$'+ID;

// Terminals
hidden terminal WS: /\s+/;
terminal ID returns string: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;

// Comments
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

entry Model:
    (language=Language)? // Only one language per file.
    (assets+=Asset|imports+=ImportedAsset)+
    (equivalencies+=Equivalency)*;

Asset:
    ExecutableAsset | Composer ;

ExecutableAsset:
    Prompt | Chain;

Prompt:
    'prompt' name=QualifiedName (description=STRING)? pars=Parameters ':' output=Media (outputDesc=STRING)?
    (prefix=Prefix)?
    core=Core
    (suffix=Suffix)?
    (hyper=HyperParameters)?
    AssetSeparator
    AssetLanguage
    AssetRelationships
    (ByExpressionOutputTesting)?
    ;

ImportedAsset:
    'import' (set_assets+=AssetImport (',' set_assets+=AssetImport)*|everyone='*') 'from' library=QualifiedName
    ;

AssetImport: 
    asset = [Asset:QualifiedName]('as' name=QualifiedName )?;


HyperParameters:
    hyper+=HyperParam (',' hyper+=HyperParam)*
    ;

HyperParam:
    'hyper' '(' name=STRING ',' value=STRING ')'
    ;

Chain:
    'chain' name=QualifiedName
    AssetRelationships
    (ByExpressionOutputTesting)?
    ;

Composer:
    'composer' name=QualifiedName  pars=Parameters ':' contents=Contents
    AssetSeparator
    AssetLanguage
    AssetRelationships
    ;

Prefix:
    name='prefix' '=' snippets+=Snippet (',' snippets+=Snippet)*;

Trait:
    TextTrait | ImageTrait | MediumIndependentTrait;

TextTrait:
    LiteraryStyleTrait | LanguageRegisterTrait | PointOfViewTrait;

LiteraryStyleTrait:
    'literary-style' '(' value=LiteraryStyle ')'
    ByReinforcedTraitOutputTesting;

LanguageRegisterTrait:
    'language-register' '(' value=LanguageRegister')'
    ByReinforcedTraitOutputTesting;

PointOfViewTrait: 
    'point-of-view' '(' value=PointOfView')'
    ByReinforcedTraitOutputTesting;


ImageTrait:
    MediumTrait | CameraAngleTrait | CameraSettingsTrait | LightingTrait | ProximityTrait | EffectsTrait;

MediumTrait: 
    'medium'       '(' value=Medium ')'
    ByReinforcedTraitOutputTesting;

CameraAngleTrait:
    'camera-angle' '(' value=CameraAngle ')'
    ByReinforcedTraitOutputTesting;

CameraSettingsTrait:
    'camera-settings' '(' value=CameraSettings ')'
    ByReinforcedTraitOutputTesting;

LightingTrait:
    'lighting'     '(' value=Lighting ')'
    ByReinforcedTraitOutputTesting;

ProximityTrait:
    'promixity'    '(' value=Proximity ')'
    ByReinforcedTraitOutputTesting;

EffectsTrait:
    'effects'      '(' value=Effects ')'
    ByReinforcedTraitOutputTesting;

MediumIndependentTrait:
    RelativeTrait | AudienceTrait | IncludesTrait | SimilarToTrait | ByAuthorTrait | TargetSizeTrait | ComparisonTrait ;

RelativeTrait:
    NegativeTrait | CombinationTrait;

NegativeTrait:
    'no' '(' content=Snippet ')'
    ByReinforcedTraitOutputTesting;

ComparisonTrait:
    'compare' '(' content1=Snippet ',' content2=Snippet ',' comparison=Snippet ')';

CombinationTrait:
    'between' '(' contents+=Snippet (',' contents+=Snippet)+ ')'
    ByReinforcedTraitOutputTesting;

AudienceTrait:
    'audience' '(' content=Snippet ')'
    ByReinforcedTraitOutputTesting;

IncludesTrait:
    'includes' '(' (times=INT ':')? contents+=Snippet (',' contents+=Snippet)* ')'
    ByReinforcedTraitOutputTesting;

SimilarToTrait:
    'like' '(' content =Snippet ')'
    ByReinforcedTraitOutputTesting;

ByAuthorTrait:
    'author' '(' value=Snippet ')'
    ByReinforcedTraitOutputTesting;

TargetSizeTrait:
    'size' '(' dimension=Dimension ',' type=SizeConstraint ',' amount=INT ',' unit=Unit ')'
    ByReinforcedTraitOutputTesting;

Contents:
    snippets+=Snippet (',' snippets+=Snippet)*;

Core:
    name='core' '='   snippets+=Snippet (',' snippets+=Snippet)*;

Suffix:
    name='suffix' '=' snippets+=Snippet (',' snippets+=Snippet)*;

Weight:
    'weight' relevance=Relevance;

Snippet:
    content=BaseSnippet (weight=Weight)?;

BaseSnippet:
    TextLiteral | InputRef | AssetReuse | Trait;

TextLiteral:
    content=STRING;

InputRef:
    ParameterRef | MultimodalRef;

ParameterRef:
    param=[Parameter:ParamId];

MultimodalRef:
    param=[Multimodal:FileId];

AssetReuse:
    asset=[Referenciable:QualifiedName] (pars=ParamInvokation)?;

type Referenciable = Asset|AssetImport;

ParamInvokation:
    '(' pars+=Snippet (',' pars+=Snippet )*  ')' | '(' ')';

Parameters:
    '('( pars+= Input ( ',' pars+= Input )* )?')';

Input:
    Parameter | Multimodal;

Parameter:
    name=ParamId (description=STRING)?;

Multimodal:
    name=FileId ':' format=Media (description=STRING)? (weight=Weight)?;

// Data types
Media returns string: 'text' | 'image' | 'audio' | 'video' | '3dobject';
Relevance returns string: 'min' | 'low' | 'medium' | 'high' | 'max';

// General traits
Dimension returns string: 'length' | 'duration' | 'width' | 'height' | 'depth' | 'count';
SizeConstraint returns string: 'exactly' | 'less\sthan' | 'more\sthan' | 'less\sor\sequal\sthan' | 'more\sor\sequal\sthan' | 'different\sfrom';
Unit returns string: 'character' | 'word' | 'sentence' | 'line' | 'paragraph' | 'page' | 'second' | 'minute' | 'hour' | 'frame' | 'pixel' | 'point';

// Textual Traits
LiteraryStyle returns string: 'report' | 'essay' | 'interview' | 'letter' | 'play' | 'poem' | 'song' | 'tale' | 'headline' | 'advertisement' | 'joke' | 'definition' | 'proof' | 'source\scode';
LanguageRegister returns string: 'bench-level' | 'dialect' | 'facetious' | 'formal' | 'in-house' | 'ironic' | 'neutral' | 'slang' | 'taboo' | 'technical' | 'vulgar';
PointOfView returns string: 'first\sperson' | 'second\sperson' | 'third\sperson';

// Image Traits
Medium returns string: 'photography' | 'drawing' | 'painting' | 'portrait' | 'comic\sbook\sart' | 'digital\sart' | '3D\sart';
CameraAngle returns string: 'overhead\sview' | 'low\sangle' | 'aerial\sview' | 'tilted\sframe' |  'over-the-shoulder\sshot';
CameraSettings returns string: 'fast\sshutter';
Lighting returns string: 'accent' | 'ambient' | 'atmospheric' | 'back' | 'volumetric' | 'diffuse' | 'neon' | 'dark\sshadows';
Proximity returns string: 'extreme\sclose-up' | 'close-up' | 'medium\sshot' | 'long\sshot' | 'extreme\slong\sshot';
Effects returns string: 'blur' | 'reflection' | 'distortion' ;

// ----------------------------------------------------------------------------------------
// 2024-01-17 SEMO: Extension - Language support, refinements and equivalencies
// ----------------------------------------------------------------------------------------

Language: // Change: Language should be the same for all the file -> Does not make sense
    'language''=' name=(ID|STRING)
    //('code=' code=STRING)?
    ('region''=' region=STRING)? //CHANGED
    ;

fragment AssetLanguage:
    ('language''=' language=ID)?
    ;

fragment AssetSeparator:
    ('separator''=' separator=STRING)?
    ;

fragment AssetRelationships:
    ('priorVersion''=' priorVersion=[Asset:ID])?
    ('refines''=' refines=[Asset:ID])?
    ;

Equivalency:
    'equivalency'
    'assets''=' ('(' (assets+=[Asset:ID])
        ((','assets+=[Asset:ID])*')'))?;

// ----------------------------------------------------------------------------------------
// 2024-01-17 SEMO: Extension - Output validators
// ----------------------------------------------------------------------------------------

//OutputValidator:
//    ByExpression | ByReinforcedTrait;

ByExpressionOutputTesting:
    'validator''=['validator=[ExecutableAsset:ID]']';
    //'validators=' '[' (validator=STRING) ']'
    //    ((',['validator=STRING)*']')?;

//ByReinforcedTrait:
    //'traitValidator'
    //validator=[ExecutableAsset:ID]
    //;

fragment ByReinforcedTraitOutputTesting:
    (validator='[reinforced]')?;

//TraitValidator:
//    '['validator=[ExecutableAsset:ID]']';