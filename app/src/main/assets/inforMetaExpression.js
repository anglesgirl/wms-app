var inforMetaExpressionVersion = '11.0.1.0006';

var instructionTypes = [ ]; // all instructions
var instructionsLevel1 = [ ]; // all top level instructions
var instructionsEXP = [ ];
var instructionsLevel2 = [ ]; // all sub instructions.

// all instructions, with parameters and any dependent sub instructions.
var fullInstructions = [
		{
			func : 'ABOUTHELP',
			params : [
					'numLines', 'msg'
			],
			subs : [ ]
		}, {
			func : 'DISPLAYMESSAGE',
			params : [
					'msg', 'mtype', 'buttons', 'toScreen', 'repeat', 'toScreen2', 'repeat2', 'exp'
			],
			subs : [
					{
						func : 'SETDISPLAY',
						params : [
								'toScreen', 'vector', 'vector'
						],
						subs : [ ]
					}, {
						func : 'SETRETDISPLAY',
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}
			]
		}, {
			func : 'AUTOENTER',
			params : [ ],
			subs : [ ]
		}, {
			func : 'CALCFIELDPOS',
			params : [
					'int', 'int'
			],
			subs : [ ]
		}, {
			func : 'CANCEL',
			params : [
					'toScreen', '*repeat', '*exp'
			],
			subs : [
				{
					func : 'SETCANCEL',
					params : [
							'toScreen', 'vector1', 'vector2'
					],
					subs : [ ]
				}
			]
		}, {
			func : 'DELETEONENTER',
			params : [ ],
			subs : [ ]
		}, {
			func : 'DISPLAYONLY',
			params : [ ],
			subs : [ ]
		}, {
			func : "IFRECEIVE",
			params : [
					'toScreen', 'repeat', 'exp'
			],
			subs : [
					{
						func : "SETIFRECEIVE",
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}, {
						func : "SETRETIFRECEIVE",
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}
			]
		}, {
			func : "SENDIF",
			params : [
					'toScreen', 'repeat', 'exp'
			],
			subs : [
					{
						func : "SETSENDIF",
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}, {
						func : "SETRETSENDIF",
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}
			]
		}, {
			func : "ERRORYESNO",
			params : [
					'errorCode', 'toScreen', 'repeat', 'toScreen2', 'repeat2', 'msg'
			],
			subs : [
				{
					func : "SETERROR",
					params : [
							'toScreen', 'vector1', 'vector2'
					],
					subs : [ ]
				}
			]
		}, {
			func : "ONENTER",
			params : [
					'toScreen', 'repeat'
			],
			subs : [
				{
					func : "SETENTER",
					params : [
							'toScreen', 'vector1', 'vector2'
					],
					subs : [ ]
				}
			]
		}, {
			func : "ERROR",
			params : [
					'errorCode', 'toScreen', '*repeat'
			],
			subs : [
				{
					func : "SETERROR",
					params : [
							'*toScreen', 'vector1', 'vector2'
					],
					subs : [ ]
				}
			]
		}, {
			func : 'ERRORWARNING',
			params : [
					'errorCode', 'msg'
			],
			subs : [ ]
		}, {
			func : 'EXITONERROR',
			params : [ ],
			subs : [ ]
		}, {
			func : 'EXITONENTER',
			params : [ ],
			subs : [ ]
		}, {
			func : 'GLOBALSEND',
			params : [
					'toScreen', 'vector1', 'errorCode'
			],
			subs : [ ]
		}, {
			func : 'NOXMIT',
			params : [ ],
			subs : [ ]
		}, {
			func : 'MENU',
			params : [ ],
			subs : [ ]
		}, {
			func : "OPTIONSKEY",
			params : [
					'key', 'toScreen', 'repeat', '*msg'
			],
			subs : [
					{
						func : "SETOPTIONSKEY",
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}, {
						func : "SETOPTIONKEY",
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}
			]
		}, {
			func : 'SELECTOR',
			params : [ ],
			subs : [ ]
		}, {
			func : 'LOOKUPSCREEN',
			params : [ ],
			subs : [ ]
		}, {
			func : 'SEARCHRESULT',
			params : [ ],
			subs : [ ]
		}, {
			func : 'EXITONKEY',
			params : [ ],
			subs : [ ]
		}, {
			func : 'NOBRCDPARSE',
			params : [ ],
			subs : [ ]
		}, {
			func : "KEYSTROKE",
			params : [
					'key', 'toScreen', 'repeat'
			],
			subs : [
					{
						func : "SETKEYSTROKE",
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}, {
						func : "SETRETKEYSTROKE",
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}
			]
		}, {
			func : 'SETSCREEN',
			params : [
					'toScreen', 'vector', 'vector'
			],
			subs : [
					{
						func : 'SETSCREEN',
						params : [
								'toScreen', 'vector', 'vector'
						],
						subs : [ ]
					}, {
						func : 'SETRETSCREEN',
						params : [
								'toScreen', 'vector1', 'vector2'
						],
						subs : [ ]
					}
			]
		}, {
			func : 'SHOWSINGLESCREEN',
			params : [ ],
			subs : [ ]
		}, {
			func : 'SKIPONBLANK',
			params : [ ],
			subs : [ ]
		}, {
			func : 'VALIDATEINPUT',
			params : [ ],
			subs : [ ]
		}, {
			func : 'VERTICALSCAN',
			params : [ ],
			subs : [ ]
		}, {
			func : 'XMITONLY',
			params : [ ],
			subs : [ ]
		}
];

$( function( ) {
	var inst;
	for ( var idx = 0; idx < fullInstructions.length; ++idx ) {
		inst = fullInstructions[ idx ];
		instructionTypes.push( inst.func );
		instructionsLevel1.push( inst.func );
		if ( inst.func == 'KEYSTROKE' )
			instructionsLevel1.push( 'KEY' );
		if ( inst.func == 'GLOBALSEND' )
			instructionsLevel1.push( 'GLOBAL' );

		if ( inst.params.length > 0 ) {
			for ( var paramIdx = 0; paramIdx < inst.params.length; ++paramIdx )
				if ( inst.params[ paramIdx ] == 'exp' )
					instructionsEXP.push( inst.func );
		}

		for ( var subIdx = 0; subIdx < inst.subs.length; ++subIdx ) {
			instructionTypes.push( inst.subs[ subIdx ].func );
			instructionsLevel2.push( inst.subs[ subIdx ].func );
		}
	}
} );

function InforMetaExpression( ) {
	this.IDX = -1;
	// the full text of the instruction.
	this.full = '';
	// the screen to goto if this instruction is triggered.
	this.screen = '';
	// for multi-choice instructions, the second screen to use
	this.screen2 = '';
	// unused currently.
	this.indicator = '';
	this.action = false;
	// the function name used in the instruction
	this.func = '';
	// if instruction has an instruction to validate
	this.exp = '';
	// contains text if an expression fails to parse correctly.
	this.error = '';
	// numTimes value, of the number of times to run the screen contained in the instruction
	this.repeat = -1;
	// key value for KEY press instructions
	this.key = '';
	// message to display to user for multi-choice
	this.msg = '';
	// numTimes value for screen2
	this.repeat2 = -1;
	// the error code to trigger off from.
	this.errorCode = '';
	// any SET or SETRET instructions tied to this instruction.
	this.subs = [ ];
	// the parsed values from this.exp. This array at the top level contains
	// all the OR expressions. Inside each is an array of the AND expressions
	this.outerExpressions = [ ];
	this.mtype = null;
	this.buttons = null;

	// used by ABOUTHELP for number of lines this instruction takes.
	this.numLines = 1;
};

InforMetaExpression.prototype = {
	vectorTypes : [
			"SEND", "RECEIVE", "DISPLAY", "HEADER", "FOOTER"
	],

	instOPS : [
			{
				op : '!=',
				func : function( a, b ) {
					return a !== b;
				}
			}, {
				op : '<=',
				func : function( a, b ) {
					return a <= b;
				}
			}, {
				op : '>=',
				func : function( a, b ) {
					return a >= b;
				}
			}, {
				op : '=',
				func : function( a, b ) {
					return a === b;
				}
			}, {
				op : '<>',
				func : function( a, b ) {
					return a !== b;
				}
			}, {
				op : '>',
				func : function( a, b ) {
					return a > b;
				}
			}, {
				op : '<',
				func : function( a, b ) {
					return a < b;
				}
			}
	],

	parseInstruction : function parseInstruction( inst, instructData, fieldData ) {
		this.IDX = parseInt( inst.IDX );
		this.full = inst.PLIST;
		this.screen = inst.SCR1 == 'null' ? '' : inst.SCR1.toUpperCase( );
		this.screen2 = inst.SCR2 == 'null' ? '' : inst.SCR2.toUpperCase( );
		this.indicator = inst.indicator ? inst.indicator : '';

		try {
			var start = inst.PLIST.indexOf( '(' );
			var end = -1;
			if ( start == -1 ) {
				this.func = inst.PLIST;
			} else {
				this.func = inst.PLIST.substring( 0, start );
				this.screen = inst.SCR1 == 'null' ? '' : inst.SCR1.toUpperCase( );
				this.screen2 = inst.SCR2 == 'null' ? '' : inst.SCR2.toUpperCase( );

				var instTempl = this.getInstructionTemplate( this.func );
				start = start + 1;
				if ( instTempl ) {
					var param;
					var paramValue;
					var paramName;
					for ( var pIdx = 0; pIdx < instTempl.params.length; ++pIdx ) {
						param = instTempl.params[ pIdx ];
						if ( param.substring( 0, 1 ) == '*' ) {
							param = param.substring( 1 );
						}

						if ( pIdx < instTempl.params.length - 1 ) {
							end = inst.PLIST.indexOf( ',', start );
							if ( end == -1 )
								end = inst.PLIST.length - 1;
						} else {
							end = inst.PLIST.length - 1;
						}

						if ( end == -1 ) {
							this.error = this.func + ' does not have enough parameters [' + this.full + '].';
							continue;
						}

						paramValue = inst.PLIST.substring( start, end ).trim( );
						// this happens when an optional parameter is not included.
						if ( paramValue == ')' ) {
							if ( param.trim( ) == 'exp' )
								paramValue = "(TRUE)";
							else if ( param.trim( ) == 'repeat' )
								paramValue = this.func === 'ERROR' ? -1 : 1;
							else if ( param.trim( ) == 'msg' )
								paramValue = '';
						}

						paramName = param.trim( );
						this.assignParamToValue( paramName, paramValue );
						start = end + 1;

						if ( paramName == 'exp' ) {
							if ( this.func == 'CANCEL' ) {
								if ( isNaN( this.repeat ) ) {
									// repeat and exp are optional for CANCEL and sometimes repeat
									// is left out and confuses the parser thinking what was intended as
									// the exp is placed into repeat.
									this.exp = this.repeat;
									this.repeat = 1;
								}
							}
							this.createExpressions( );
						}
					}

					if ( this.exp.length > 0 )
						this.error = this.verifyExpression( fieldData );

					if ( instTempl.subs.length > 0 ) {
						this.createSubExpressions( instructData, instTempl );
					}
				} else {
					this.error = 'Invalid function name [' + this.func + ']';
				}
			}
			if ( instructionsEXP.indexOf( this.func ) != -1 )
				this.action = true;

		} catch ( e ) {
			console.error( 'error: failed to parse instruction! ' );
			console.error( inst );
			console.error( e );
			this.error = e.message;
		}
	},

	createExpressions : function( ) {
		var topLevel = this.exp.split( '|' ); // break apart the OR pieces
		var expX, expA, func, pLevel, fields, fieldVector, fieldName, op;

		for ( var tIdx = 0; tIdx < topLevel.length; ++tIdx ) {
			this.outerExpressions[ tIdx ] = [ ];
			expX = topLevel[ tIdx ].trim( );
			expX = removeParans( expX.replace( '&&', '&' ) );
			var andLevel = expX.split( '&' );

			for ( var aIdx = 0; aIdx < andLevel.length; ++aIdx ) {
				expA = removeParans( andLevel[ aIdx ].trim( ) );
				if ( expA.toLowerCase( ) == 'true' ) {
					this.outerExpressions[ tIdx ].push( {
						vector1 : 'CONST',
						field1 : expA,
						op : '=',
						vector2 : 'CONST',
						field2 : expA,
						dataType : 'string'
					} );
					continue;
				} else if ( expA.toLowerCase( ) == 'false' ) {
					this.outerExpressions[ tIdx ].push( {
						vector1 : 'CONST',
						field1 : expA,
						op : '!=',
						vector2 : 'CONST',
						field2 : expA,
						dataType : 'string'
					} );
					continue;
				}

				// pLevel
				// index 0 is the field name to check.
				// index 1 is the value to check against
				// index 2 is operator to use.
				func = removeParans( expA );
				func = func.substring( 0, 5 );
				pLevel = removeParans( expA.substring( 5, expA.length ) ).split( ',' );
				fields = pLevel[ 0 ].split( '->' );
				fieldVector = fields[ 0 ].trim( );
				fieldName = fields[ 1 ].trim( );
				op = pLevel[ 2 ].trim( );
				var DT = func == 'EXPRC' ? 'string' : func == 'EXPRI' ? 'integer' : 'float';
				var innerExpr = {
					vector1 : fieldVector,
					field1 : fieldName,
					op : op,
					vector2 : 'CONST',
					field2 : pLevel[ 1 ],
					dataType : DT
				};

				if ( innerExpr.field2.indexOf( '->' ) != -1 ) {
					fields = innerExpr.field2.split( '->' );
					innerExpr.vector2 = fields[ 0 ].trim( );
					innerExpr.field2 = fields[ 1 ].trim( );
				}
				this.outerExpressions[ tIdx ].push( innerExpr );
			}
		}
	},

	createSubExpressions : function( instructData, instTempl ) {
		var id = 0;
		var rec;
		var pString;
		var pArray;
		var dest;
		var source;
		var theSETScreen;

		for ( var idx = 0; idx < instructData.length; ++idx ) {
			rec = instructData[ idx ].PLIST;
			theSETScreen = rec.screen;

			start = rec.indexOf( '(' );
			end = rec.indexOf( ',' );
			var subFunc = rec.substring( 0, start ).trim( );

			// some different sets of instructions can exist with the same screen.
			// need to make sure we are only looking at the right types of functions.
			var proceed = false;
			for ( var sIdx = 0; sIdx < instTempl.subs.length; ++sIdx ) {
				if ( instTempl.subs[ sIdx ].func == subFunc ) {
					proceed = true;
					break;
				}
			}

			if ( !proceed )
				continue;

			// all subs are in the form of FUNC(SCREEN,VECTOR,VECTOR) so just doing it
			// without looking at the values in template.subs
			pString = removeParans( rec.substring( start ) );
			pArray = pString.split( ',' );

			dest = null;
			source = null;

			if ( pArray.length == 3 ) {
				theSETScreen = pArray[ 0 ].toUpperCase( ).trim( );
				if ( theSETScreen == this.screen || theSETScreen == this.screen2 ) {
					dest = pArray[ 1 ];
					source = pArray[ 2 ];
				} else {
					continue;
				}
			} else if ( pArray.length == 2 ) {
				// sometimes the toScreen parameter is left
				// off for some commands. We have to assume
				// it's for us
				// if the subFunc name is defined in the
				// template.
				theSETScreen = this.screen;
				dest = pArray[ 0 ];
				source = pArray[ 1 ];
			}

			if ( dest && source ) {
				this.subs.push( {
					id : ++id,
					error : instructData[ idx ].error ? instructData[ idx ].error : '',
					indicator : instructData[ idx ].indicator ? instructData[ idx ].indicator : '',
					screen : theSETScreen,
					full : rec,
					func : subFunc,
					source : source,
					destination : dest,
					IDX : instructData[ idx ].IDX
				} );
			}
		}
	},

	assignParamToValue : function( pName, pValue ) {
		if ( pName == 'toScreen' || pName == 'screen' )
			this.screen = pValue.toUpperCase( );
		else if ( pName == 'toScreen2' )
			this.screen2 = pValue.toUpperCase( );
		else if ( pName == 'repeat' )
			this.repeat = pValue;
		else if ( pName == 'vector1' )
			this.source = pValue;
		else if ( pName == 'vector2' )
			this.destination = pValue;
		else if ( pName == 'msg' )
			this.msg = pValue;
		else if ( pName == 'key' )
			this.key = pValue;
		else if ( pName == 'exp' )
			this.exp = pValue;
		else if ( pName == 'errorCode' )
			this.errorCode = pValue;
		else
			this[ pName ] = pValue;
	},

	assignValueToParam : function( pName ) {
		if ( pName == 'toScreen' || pName == 'screen' )
			return this.screen;
		else if ( pName == 'toScreen2' )
			return this.screen2;
		else if ( pName == 'repeat' )
			return this.repeat;
		else if ( pName == 'vector1' )
			return this.source;
		else if ( pName == 'vector2' )
			return this.destination;
		else if ( pName == 'msg' )
			return this.msg;
		else if ( pName == 'key' )
			return this.key;
		else if ( pName == 'exp' )
			return this.exp;
		else if ( pName == 'errorCode' )
			return this.errorCode;
		else
			return this[ pName ];
	},

	getOP : function( op ) {
		;
		for ( var oIdx = 0; oIdx < this.instOPS.length; ++oIdx )
			if ( this.instOPS[ oIdx ].op == op )
				return this.instOPS[ oIdx ].func;

		return null;
	},

	verifyExpression : function( fieldData ) {
		var validFuncs = [
				'EXPRI', 'EXPRC', 'EXPRF'
		];
		var validOps = [
				'!=', '=', '<>', '>', '<', '>=', '<='
		];

		var topLevel = this.exp.split( '|' ); // break apart the OR pieces
		var expX;
		var andLevel;
		var expA;
		var func;
		var pLevel;
		var fields;
		for ( var tIdx = 0; tIdx < topLevel.length; ++tIdx ) {
			expX = removeParans( topLevel[ tIdx ].trim( ) );
			// ugh, in ONE screen it uses double &&, so check if someone messed this up
			expX = expX.replace( '&&', '&' );
			andLevel = expX.split( '&' );

			for ( var aIdx = 0; aIdx < andLevel.length; ++aIdx ) {
				expA = removeParans( andLevel[ aIdx ].trim( ) );
				if ( expA.toLowerCase( ) == 'true' || expA.toLowerCase( ) == 'false' )
					continue;
				if ( expA.length < 5 )
					return 'Expression [' + expA + '] is missing parameters';
				func = expA.substring( 0, 5 );
				if ( validFuncs.indexOf( func ) == -1 )
					return 'Expression [' + expA + '] is using an undefined function [' + func + ']';
				pLevel = removeParans( expA.substring( 5, expA.length ) ).split( ',' );
				if ( pLevel.length != 3 )
					return 'Expression [' + expA + '] requires 3 parameters. Not enough or too few parameters passed.';
				if ( validOps.indexOf( pLevel[ 2 ].trim( ) ) == -1 )
					return 'Expression [' + expA + '] has an invalid operator [' + pLevel[ 2 ].trim( ) + ']';

				fields = pLevel[ 0 ].split( '->' );
				if ( fields.length != 2 )
					return 'Field name [' + pLevel[ 0 ] + '] is not properly formatted.';
				fields[ 0 ] = fields[ 0 ].trim( );
				fields[ 1 ] = fields[ 1 ].trim( );
				if ( this.vectorTypes.indexOf( fields[ 0 ] ) == -1 )
					return 'Vector type of [' + fields[ 0 ] + '] is not a valid type';

				if ( fieldData ) {
					var found = false;
					var widget;
					for ( var fIdx = 0; fIdx < fieldData.length; ++fIdx ) {
						widget = fieldData[ fIdx ];
						if ( widget.NAME == fields[ 1 ] && widget.VTYPE == fields[ 0 ] ) {
							found = true;
							break;
						}
					}
					if ( !found )
						return pLevel[ 0 ] + ' is not a valid field defined in this form. ';
				}
			}
		}

		return '';
	},

	evaluate : function( fieldData ) {
		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( screenDebug( 'SCREENFLOW', currentScreen, 'start evaluting expression', '[' + this.full + '][' + this.error + ']' ) );

		if ( this.error && this.error.length && this.error.length > 0 ) {
			displayPageError( SCElocalize( 'Error_InvalidExpression', this.error ), function( ) {
				exitScreen( );
			} );
			return false;
		}

		if ( !fieldData )
			return false;

		if ( this.func == 'ONENTER' )
			return true;

		if ( this.outerExpressions.length == 0 )
			return false;

		var theTruth = true;
		var expr = this.outerExpressions;
		var size = expr.length;

		var tIdx, expX, expA, val1, val2;

		for ( tIdx = 0; tIdx < size; ++tIdx ) {
			expX = expr[ tIdx ];
			theTruth = true;

			for ( var aIdx = 0; aIdx < expX.length && theTruth; ++aIdx ) {
				expA = expX[ aIdx ];

				if ( expA.vector1 == 'CONST' ) {
					val1 = expA.field1;
				} else {
					val1 = null;
					for ( var fIdx = 0; fIdx < fieldData.length; ++fIdx ) {
						if ( fieldData[ fIdx ].NAME == expA.field1 && fieldData[ fIdx ].VTYPE == expA.vector1 ) {
							val1 = getValue( fieldData[ fIdx ].getRawValue( ) );
							break;
						}
					}
				}

				if ( expA.vector2 == 'CONST' ) {
					val2 = expA.field2;
				} else {
					val2 = null;
					for ( var fIdx = 0; fIdx < fieldData.length; ++fIdx ) {
						if ( fieldData[ fIdx ].NAME == expA.field2 && fieldData[ fIdx ].VTYPE == expA.vector2 ) {
							val2 = getValue( fieldData[ fIdx ].getRawValue( ) );
							break;
						}
					}
				}

				try {
					switch ( expA.dataType ) {
						case 'integer' : {
							val2 = stringToInt( val2 );
							val1 = stringToInt( val1 );
							break;
						}
						case 'string' : {
							val2 = ( val2 ? '' + val2 : '' );
							val2 = val2.trim( );
							val1 = ( val1 ? '' + val1 : '' );
							val1 = val1.trim( );
							break;
						}
						case 'float' : {
							val2 = stringToFloat( val2 );
							val1 = stringToFloat( val1 );
							break;
						}
						default : {
							theTruth = false;
						}
					}
				} catch ( e ) {
					theTruth = false;
					break;
				}

				if ( theTruth ) {
					var operator = this.getOP( expA.op );
					if ( operator ) {
						theTruth = operator( val1, val2 );
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( screenDebug( 'SCREENFLOW', currentScreen, 'evaluate results', '[' + val1 + '] ' + expA.op + ' [' + val2 + '] is ' + theTruth + ']' ) );
					} else {
						theTruth = false;
					}
				}
			}

			//
			// end of processing an AND expression. check final value of theTruth
			// we are in an OR phase here, if it's still true at this point, we have a winner
			//
			// if not true in this OR loop check the next AND condition to see
			// if it matches
			//
			if ( theTruth ) {
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( screenDebug( 'SCREENFLOW', currentScreen, 'evaluated true', this.full ) );
				return true;
			}

		}

		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( screenDebug( 'SCREENFLOW', currentScreen, 'evaluated false', this.full ) );
		return false;
	},

	merge : function( newExp ) {
		var merged = false;

		if ( newExp.func != 'DISPLAYMESSAGE' && newExp.func == this.func && newExp.screen == this.screen ) {
			var parsedOuterIdx, parsedInnerIdx, testOuterIdx, testInnerIdx, parsedOuterSize, parsedInnerSize, testOuterSize, testInnerSize, parsedOuterExp, testOuterExp, parsedInnerExp, testInnerExp;

			parsedOuterSize = newExp.outerExpressions.length;

			for ( parsedOuterIdx = 0; parsedOuterIdx < parsedOuterSize; ++parsedOuterIdx ) {
				parsedOuterExp = newExp.outerExpressions[ parsedOuterIdx ];
				parsedInnerSize = parsedOuterExp.length;

				for ( parsedInnerIdx = 0; parsedInnerIdx < parsedInnerSize; ++parsedInnerIdx ) {
					parsedInnerExp = parsedOuterExp[ parsedInnerIdx ];
					testOuterSize = this.outerExpressions.length;

					for ( testOuterIdx = 0; testOuterIdx < testOuterSize; ++testOuterIdx ) {
						testOuterExp = this.outerExpressions[ testOuterIdx ];
						testInnerSize = testOuterExp.length;

						for ( testInnerIdx = 0; testInnerIdx < testInnerSize; ++testInnerIdx ) {
							testInnerExp = testOuterExp[ testInnerIdx ];
							if ( parsedInnerExp.vector1 == testInnerExp.vector1 && parsedInnerExp.field1 == testInnerExp.field1 ) {
								testInnerExp.dataType = parsedInnerExp.dataType;
								testInnerExp.vector2 = parsedInnerExp.vector2;
								testInnerExp.field2 = parsedInnerExp.field2;
								testInnerExp.op = parsedInnerExp.op;
								merged = true;
							}
						}
					}
				}
			}

		}

		return merged;
	},

	getInstructionTemplate : function( func ) {
		for ( var idx = 0; idx < fullInstructions.length; ++idx ) {
			var inst = fullInstructions[ idx ];
			if ( inst.func == func )
				return inst;
			for ( var childIdx = 0; childIdx < inst.subs.length; ++childIdx )
				if ( inst.subs[ childIdx ].func == func )
					return inst.subs[ childIdx ];
		}

		return null;
	},

	dump : function( ) {
		if ( !appConfig.debug.DUMP )
			return;

		return '<tr>' + '<td>' + this.IDX + '</td>' + '<td>' + this.full + '</td>' + '<td>' + this.screen + '</td>' + '<td>' + this.screen2 + '</td>' + '<td>' + this.indicator + '</td>' + '<td>' + this.action + '</td>' + '<td>' + this.func + '</td>' + '<td>' + this.exp + '</td>' + '<td>' + this.error + '</td>' + '<td>' + this.repeat + '</td>' + '<td>' + this.key + '</td>' + '<td>' + this.msg + '</td>' + '<td>' + this.repeat2 + '</td>' + '<td>' + this.errorCode + '</td>' + '<td>' + JSON.stringify( this.subs ) + '</td>' + '<td>' + JSON.stringify( this.outerExpressions ) + '</td>' + '</tr>';
	}

};
