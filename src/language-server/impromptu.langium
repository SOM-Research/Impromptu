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
    (language=Language)+ // Only one language per file
    (assets+=Asset|imports+=ImportedAsset)+
    (equivalencies=Equivalency)*;

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
    (ByExpressionOutputTesting)*
    ;

ImportedAsset:
    'import' asset_name+=AssetImport (',' asset_name+=AssetImport)* 'from' library=QualifiedName
    ;

AssetImport:
    [Asset:QualifiedName];


HyperParameters:
    hyper+=HyperParam (',' hyper+=HyperParam)*
    ;

HyperParam:
    'hyper' '(' name=STRING ',' value=STRING ')'
    ;

Chain:
    'chain' name=QualifiedName
    AssetRelationships
    (ByExpressionOutputTesting)*
    ;

Composer:
    'composer' name=QualifiedName  pars=Parameters contents=Contents (separator=STRING)?
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
    NegativeTrait | AlternativeTrait | CombinationTrait;

NegativeTrait:
    'no' '(' content=Snippet ')'
    ByReinforcedTraitOutputTesting;

ComparisonTrait:
    'compare' '(' content1=Snippet ',' content2=Snippet ',' comparison=Snippet ')';

AlternativeTrait:
    'alternative' '(' contents+=Snippet (',' content+=Snippet)+ ')'
    ByReinforcedTraitOutputTesting;

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
    'like' '(' contents+=Snippet (',' contents+=Snippet)* ')'
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
   (  '('  pars+= Input ( ',' pars+= Input )* ')' )? | '(' ')' ;

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
SizeConstraint returns string: 'exactly' | 'less than' | 'more than' | 'less or equal than' | 'more or equal than' | 'different from';
Unit returns string: 'character' | 'word' | 'sentence' | 'line' | 'paragraph' | 'page' | 'second' | 'minute' | 'hour' | 'frame' | 'pixel' | 'point';

// Textual Traits
LiteraryStyle returns string: 'report' | 'essay' | 'interview' | 'letter' | 'play' | 'poem' | 'song' | 'tale' | 'headline' | 'advertisement' | 'joke' | 'definition' | 'proof' | 'source code';
LanguageRegister returns string: 'bench-level' | 'dialect' | 'facetious' | 'formal' | 'in-house' | 'ironic' | 'neutral' | 'slang' | 'taboo' | 'technical' | 'vulgar';
PointOfView returns string: 'first person' | 'second person' | 'third person';

// Image Traits
Medium returns string: 'photography' | 'drawing' | 'painting' | 'portrait' | 'comic book art' | 'digital art' | '3D art';
CameraAngle returns string: 'overhead view' | 'low angle' | 'aerial view' | 'tilted frame' |  'over-the-shoulder shot';
CameraSettings returns string: 'fast shutter';
Lighting returns string: 'accent' | 'ambient' | 'atmospheric' | 'back' | 'volumetric' | 'diffuse' | 'neon' | 'dark shadows';
Proximity returns string: 'extreme close-up' | 'close-up' | 'medium shot' | 'long shot' | 'extreme long shot';
Effects returns string: 'blur' | 'reflection' | 'distortion' ;

// ----------------------------------------------------------------------------------------
// 2024-01-17 SEMO: Extension - Language support, refinements and equivalencies
// ----------------------------------------------------------------------------------------

Language: // Change: Language should be the same for all the file -> Does not make sense
    'language=' name=(ID|STRING)
    //('code=' code=STRING)?
    ('region=' region=STRING)? //CHANGED
    ;

fragment AssetLanguage:
    ('language=' language=ID)?
    ;

fragment AssetSeparator:
    ('separator=' separator=STRING)?
    ;

fragment AssetRelationships:
    ('priorVersion=' priorVersion=[Asset:ID])?
    ('refines=' refines=[Asset:ID])?
    ;

Equivalency:
    'equivalency'
    'assets=' ('(' (assets+=[Asset:ID])
        ((','assets+=[Asset:ID])*')'))?;

// ----------------------------------------------------------------------------------------
// 2024-01-17 SEMO: Extension - Output validators
// ----------------------------------------------------------------------------------------

//OutputValidator:
//    ByExpression | ByReinforcedTrait;

ByExpressionOutputTesting:
    'validator=['validator=[ExecutableAsset:ID]']';
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