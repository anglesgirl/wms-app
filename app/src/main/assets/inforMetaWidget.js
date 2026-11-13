var inforMetaWidgetVersion = '11.0.1.0006';

var WIDGET_NAME_IDX = 0;
var WIDGET_TYPE_IDX = 1;
var VECTOR_NAME_IDX = 2;
var VECTOR_POSITION_IDX = 3;
var SCREEN_NAME_IDX = 4;
var SCREEN_VERSION_IDX = 5;
var DESCRIPTION_IDX = 6;
var PROCEDURE_NAME_IDX = 7;
var LABEL_TEXT_IDX = 8;
var LABEL_X_IDX = 9;
var LABEL_Y_IDX = 10;
var LOOKUP_IDX = 11;
var STATIC_IDX = 12;
var DATA_IDX = 13;
var DATA_X_IDX = 14;
var DATA_Y_IDX = 15;
var DEFAULT_DATA_IDX = 16;
var HINT_TEXT_IDX = 17;
var CHOICE_DISPLAY_IDX = 18;
var CHOICE_HELP_IDX = 19;
var CHOICE_VALUES_IDX = 20;
var DBNAME_IDX = 21;
var FORMAT_IDENTIFIER_IDX = 22;
var FLD_EXPR_EDITABLE_IDX = 23;
var FLD_EXPR_MANDATORY_IDX = 24;
var FLD_EXPR_VISIBLE_IDX = 25;
var FORCEDUPPER_IDX = 26;
var MASK_IDX = 27;
var USE_MASK_SIZE_IDX = 28;
var NUM_LINES_IDX = 29;
var ECHO_CHAR_IDX = 30;
var EDIT_STATE_IDX = 31;
var DYN_DFLT_PROC_NAME_IDX = 32;
var FIELD_GROUP_NAME_IDX = 33;
var IMAGE_IDX = 34;
var MENU_COLOR_IDX = 35;
var FG_PROCEDURE_NAME_IDX = 36;
var BORDER_IDX = 37;
var BORDER_COLOR_IDX = 38;
var BACKGROUND_COLOR_IDX = 39;
var TEXT_COLOR_IDX = 40;
var BARCODE_EXPR_IDX = 41;
var BARCODE_CODE_IDX = 42;
var CLR_IFNOT_RTRN_IDX = 43;

var WIDGET_LABEL = 0;
var WIDGET_INPUT = 1;
var WIDGET_CHOICE = 2;
var WIDGET_MULTI = 3;
var WIDGET_DATE = 4;
var WIDGET_IMAGE = 5;

var FIRE_FG_HANDLER = true;

function InforMetaWidget( theScreen, props ) {
	this.PARENT = theScreen;
	//
	// this tracks if the widget field data matches what's in the HTML field. With
	// Editstate of 0 or 1, it is possible for the two parts to not be in sync.
	// Because the user in WebRF doesn't have to visit every field, we need to track
	// fields they haven't been in. This is checked before an Enter(Commit) of the screen
	// where the values in the screen are placed into the widget field data, before any
	// parameter passing or XMITs are done. If it wasn't visited, we sync up the field data with
	// what is displayed on screen.
	// So why are we doing this? Because Trident did and there are some screens that don't
	// do an Enter(Commit) but use Escape instead and expect to use the widget field data
	// and NOT what is on the screen display!!!! Since it's possible the two will be out of
	// sync we need to mimic that!!!!!
	//
	this.inDisplaySync = false;

	if ( props && props.length && props.length >= 38 ) {
		this.NAME = this.getIncomingProperty( props, WIDGET_NAME_IDX ); // WIDGET_NAME
		this.WTYPE = stringToInt( this.getIncomingProperty( props, WIDGET_TYPE_IDX ) ); // WIDGET_TYPE
		this.VTYPE = this.getIncomingProperty( props, VECTOR_NAME_IDX ); // VECTOR_NAME
		this.VTYPEPOS = parseInt( this.getIncomingProperty( props, VECTOR_POSITION_IDX ) ); // VECTOR_POSITION

		this.TEXT = this.getIncomingProperty( props, LABEL_TEXT_IDX ); // LABEL_TEXT
		this.RVALUE = this.getIncomingProperty( props, DATA_IDX ); // DATA
		this.DVALUE = this.getIncomingProperty( props, DEFAULT_DATA_IDX ); // DEFAULT_DATA

		this.EXPR_VIS = this.getIncomingProperty( props, FLD_EXPR_VISIBLE_IDX ); // FLD_EXPR_VISIBLE
		this.DBNAME = this.getIncomingProperty( props, DBNAME_IDX ); // DBNAME
		this.EDITSTATE = stringToInt( this.getIncomingProperty( props, EDIT_STATE_IDX ) ); // EDIT_STATE
		this.FGNAME = this.getIncomingProperty( props, FIELD_GROUP_NAME_IDX ); // field group name
		this.FGPROCNAME = this.getIncomingProperty( props, FG_PROCEDURE_NAME_IDX );
		this.DYNDFLT = this.getIncomingProperty( props, DYN_DFLT_PROC_NAME_IDX ); // dynamic default proc name
		this.FORMAT_ID = this.getIncomingProperty( props, FORMAT_IDENTIFIER_IDX ); // EANAI NOW format_identifier

		this.BARCODE_EXPR = this.getIncomingProperty( props, BARCODE_EXPR_IDX );
		this.BARCODE_CODE = this.getIncomingProperty( props, BARCODE_CODE_IDX );
		this.BARCODE_CLEAR = this.getBoolean( this.getIncomingProperty( props, CLR_IFNOT_RTRN_IDX ) );
		if ( this.getIncomingProperty( props, IMAGE_IDX ).length > 0 ) {
			this.IMGIDX = parseInt( this.getIncomingProperty( props, IMAGE_IDX ) );
		}

		if ( this.WTYPE === WIDGET_DATE ) {
			// date field.
			this.MASK = this.getIncomingProperty( props, MASK_IDX ); // MASK
			this.dateValue = new InforDate( );

			// have some date widget screens coming in now. make sure the
			// users date locale is all set.
			if ( !closestDateCulture )
				findClosestDateCulture( usersDateLocale, true );
			if ( this.MASK === '{datetime}' ) {
				this.dateValue.datetime = true;
			} else if ( this.MASK != "{date}" ) {
				throw SCElocalize( 'Error_InvalidDateMaskData' );
			}
		}

		if ( this.WTYPE === WIDGET_IMAGE ) {
			this.fileName = null;
		}

		// set large so all hidden fields are sorted to the end of the field array
		// if widget is visible, these values get overridden below.
		this.VPOS = 9999;
		this.ORIGVPOS = 9999;
		this.HPOS = 9999;

		this.ID = this.NAME + ( this.VTYPE == 'SEND' ? '_0' : this.VTYPE == 'DISPLAY' ? '_1' : '_A' );

		if ( theScreen && theScreen.screenID == -1 ) {
			// SCREEN_NAME 4
			// SCREEN_VERSION 5
			// DESCRIPTION 6
			// PROCEDURE_NAME 7
			theScreen.screenName = this.getIncomingProperty( props, SCREEN_NAME_IDX ).toUpperCase( );
			theScreen.screenID = this.getIncomingProperty( props, SCREEN_VERSION_IDX );
			theScreen.desc = this.getIncomingProperty( props, DESCRIPTION_IDX );
			theScreen.procName = this.getIncomingProperty( props, PROCEDURE_NAME_IDX );
			if ( theScreen.procName.startsWith( appConfig.procPrefix ) ) {
				theScreen.appFlag = theScreen.procName.substring( appConfig.procPrefix.length );
			} else {
				theScreen.appFlag = theScreen.procName;
			}
		}

		if ( this.VTYPE != 'RECEIVE' && this.EXPR_VIS != '0' ) {
			// theses values we only care about if it's a visible field on the screen.
			this.ISAIPK = this.getBoolean( this.getIncomingProperty( props, 11 ) ); // IS_AIPK
			this.LKUP = this.getIncomingProperty( props, LOOKUP_IDX ); // LOOKUP_SCREEN
			this.STATIC = this.getBoolean( this.getIncomingProperty( props, STATIC_IDX ) ); // POS_IS_STATIC
			if ( this.WTYPE != WIDGET_LABEL ) {
				this.HPOS = parseInt( this.getIncomingProperty( props, DATA_X_IDX ) ); // DATA_X
				this.VPOS = parseInt( this.getIncomingProperty( props, DATA_Y_IDX ) ); // DATA_Y
			} else {
				this.HPOS = parseInt( this.getIncomingProperty( props, LABEL_X_IDX ) ); // LABEL_X
				this.VPOS = parseInt( this.getIncomingProperty( props, LABEL_Y_IDX ) ); // LABEL_Y
			}
			this.ORIGVPOS = this.VPOS;
			this.HINT_TEXT = this.getIncomingProperty( props, HINT_TEXT_IDX );
			this.CHOICE_DISPLAY = this.getIncomingProperty( props, CHOICE_DISPLAY_IDX ).length > 0 ? this.getIncomingProperty( props, CHOICE_DISPLAY_IDX ).split( '|' ) : [ ]; // CHOICE_DISPLAY
			this.CHOICE_HELP = this.getIncomingProperty( props, CHOICE_HELP_IDX ); // CHOICE_HELP
			this.CHOICE_VALUES = this.getIncomingProperty( props, CHOICE_VALUES_IDX ).length > 0 ? this.getIncomingProperty( props, CHOICE_VALUES_IDX ).split( '|' ) : [ ]; // CHOICE_VALUES
			this.EXPR_EDIT = this.getIncomingProperty( props, FLD_EXPR_EDITABLE_IDX ); // FLD_EXPR_EDITABLE
			this.EXPR_REQ = this.getIncomingProperty( props, FLD_EXPR_MANDATORY_IDX ); // FLD_EXPR_MANDATORY
			this.UPPER = this.WTYPE == WIDGET_LABEL ? 0 : this.getBoolean( this.getIncomingProperty( props, FORCEDUPPER_IDX ) ); // FORCEDUPPER
			this.MASK = this.getIncomingProperty( props, MASK_IDX ); // MASK
			this.VIS_LEN = this.MASK.length > 4 ? this.MASK.length : appConfig.RFWidth - this.HPOS;
			this.USEMASK = this.getBoolean( this.getIncomingProperty( props, USE_MASK_SIZE_IDX ) ); // USE_MASK_SIZE
			this.NUMLINES = parseInt( this.getIncomingProperty( props, NUM_LINES_IDX ) ); // NUM_LINES
			this.ECHOCHAR = this.getIncomingProperty( props, ECHO_CHAR_IDX ); // ECHO_CHAR
			this.MCOLOR = this.getIncomingProperty( props, MENU_COLOR_IDX ); // menu color
			this.BCOLOR = this.getIncomingProperty( props, BORDER_COLOR_IDX );
			this.BORDER = this.getIncomingProperty( props, BORDER_IDX ) == "true";
			this.BCK_COLOR = this.getIncomingProperty( props, BACKGROUND_COLOR_IDX );
			this.TEXT_COLOR = this.getIncomingProperty( props, TEXT_COLOR_IDX );
		}
	} else if ( props && ( !props.length || props.length < 37 ) ) {
		throw 'Invalid field information';
	} else if ( !props ) {
		this.NAME = '';
		this.WTYPE = '';
		this.VTYPE = '';
		this.VTYPEPOS = 0;
		this.TEXT = '';
		this.RVALUE = '';
		this.DVALUE = '';
		this.EXPR_VIS = '0';
		this.DBNAME = '';
		this.EDITSTATE = 2;
		this.FGNAME = '';
		this.FGPROCNAME = '';
		this.DYNDFLT = '';
		this.VPOS = 9999;
		this.ORIGVPOS = 9999;
		this.HPOS = 9999;
		this.ID = '';
	}
};

InforMetaWidget.getWidgetFromJQueryObject = function( JQobj ) {
	if ( !currentScreen || !JQobj )
		return null;

	var fieldName = $( JQobj ).attr( 'rname' );
	if ( typeof fieldName == 'undefined' )
		fieldName = $( JQobj ).attr( 'id' );

	var vectorName = $( JQobj ).attr( "vector" );

	return currentScreen.getWidgetByName( fieldName, vectorName );
};

InforMetaWidget.prototype = {
	isRequired : function( ) {
		if ( this.WTYPE == WIDGET_LABEL || typeof this.EXPR_REQ === 'undefined' || this.EXPR_REQ.length === 0 )
			return false;
		else if ( this.EXPR_REQ === '1' )
			return true;
		else if ( this.EXPR_REQ === '0' )
			return false;
		else
			return this.evaluate( this.EXPR_REQ, false );
	},

	isLookUp : function( ) {
		return ( this.LKUP && this.LKUP.length > 0 );
	},

	hasFieldGroup : function( ) {
		return this.FGNAME && this.FGNAME.length > 0 ? true : false;
	},

	isAutoBarcode : function( ) {
		if ( parent.NOAUTOPARSE )
			return false;

		if ( isDebugOn( 'WIDGET' ) )
			console.debug( widgetDebug( 'WIDGET', this, 'evaluate barcode parse', this.BARCODE_EXPR ) );
		return this.evaluate( this.BARCODE_EXPR, false );
	},

	isVisible : function( ) {
		if ( this.VTYPE == 'RECEIVE' )
			return false;
		else if ( typeof this.EXPR_VIS === 'undefined' || this.EXPR_VIS.length === 0 )
			return false;
		else if ( this.EXPR_VIS === '1' )
			return true;
		else if ( this.EXPR_VIS === '0' )
			return false;
		else {
			if ( isDebugOn( 'WIDGET' ) )
				console.debug( widgetDebug( 'WIDGET', this, 'evaluate visible status', this.EXPR_EDIT ) );
			return this.evaluate( this.EXPR_VIS, false );
		}
	},

	isReadonly : function( ) {
		// removed for now. handle in designer.
		// if (this.VTYPE === 'DISPLAY') // as per *WEIRD* Trident rules. All DISPLAY inputs are readonly.
		// return true;
		if ( this.VTYPE == 'RECEIVE' )
			return true;
		else if ( typeof this.EXPR_EDIT === 'undefined' || this.EXPR_EDIT.length === 0 || this.EXPR_EDIT === '1' )
			return false;
		else if ( this.EXPR_EDIT === '0' )
			return true;
		else {
			if ( isDebugOn( 'WIDGET' ) )
				console.debug( widgetDebug( 'WIDGET', this, 'evaluate readonly status', this.EXPR_EDIT ) );
			return !this.evaluate( this.EXPR_EDIT, true );
		}
	},

	isBlank : function( ) {
		return ( /^\s*$/ ).test( this.getRawValue( ) );
	},

	isEcho : function( ) {
		return ( this.ECHOCHAR && this.ECHOCHAR.length > 0 );
	},

	canHaveFocus : function( ) {
		var focus = false;

		if ( this.WTYPE != WIDGET_LABEL && this.isVisible( ) && ( ( currentScreen.SEARCHRESULT ) || ( !this.isReadonly( ) && ( this.VTYPE == 'SEND' || this.VTYPE == 'DISPLAY' ) ) ) )
			focus = true;

		return focus;
	},

	getVectorCSS : function( ) {
		if ( this.WTYPE == WIDGET_IMAGE )
			return 'SCE-Meta-ImageWidget';
		else
			return 'SCE-Meta-LayoutWidget ' + ( this.VTYPE == 'HEADER' ? 'header' : this.VTYPE == 'FOOTER' ? 'footer' : '' );
	},

	validateContents : function( ) {
		try {
			if ( this.WTYPE === WIDGET_LABEL || this.WTYPE === WIDGET_IMAGE ) {
				return true; // label don't care
			} else if ( this.WTYPE === WIDGET_DATE ) { // date
				return this.dateValue.isValid( );
			} else if ( this.WTYPE === WIDGET_CHOICE ) { // choice
				return true;
			} else {
				return this.validate( );
			}
		} catch ( e ) {
			console.error( e );
			return false;
		}
	},

	validate : function( ) {
		var curFldValue = this.getRawValue( );

		if ( !curFldValue || curFldValue.length === 0 )
			return true; // isRequired check will catch an empty field.

		if ( typeof this.MASK === 'undefined' || this.MASK.length === 0 ) {
			// no mask pattern to check
			return true;
		}

		var isGood = true;
		var idx = 0, l = curFldValue.length, maskChar = '', curChar = '';

		for ( ; idx < l && isGood === true; ++idx ) {
			maskChar = this.MASK[ idx ];
			curChar = curFldValue[ idx ];

			switch ( maskChar ) {
				case '?' : {
					isGood = isprint( curChar );
					break;
				}
				case '@' : {
					isGood = isalpha( curChar );
					break;
				}
				case '*' : {
					isGood = isalnum( curChar );
					break;
				}
				case '#' : {
					isGood = isdigit( curChar );
					break;
				}
				case '.' : {
					isGood = ( curChar == '.' && curFldValue.indexOf( '.', idx + 1 ) === -1 ) || isdigit( curChar );
					break;
				}

				case '%' : {
					if ( appConfig.allowDecimalQty === true || appConfig.allowDecimalQty === 'true' ) {
						if ( curChar == '.' ) {
							isGood = curFldValue.indexOf( '.', idx + 1 ) === -1;
						} else {
							isGood = isdigit( curChar );
						}
					} else {
						isGood = isdigit( curChar );
					}
					break;
				}
			}
		}

		return isGood;

	},

	getDateHintText : function( ) {
		if ( this.WTYPE === WIDGET_DATE ) {
			if ( this.HINT_TEXT.length > 0 ) {
				return this.HINT_TEXT;
			} else {
				var fmt = closestDateCulture.calendar.patterns.d;
					if ( this.dateValue.datetime ) {
					fmt = fmt + ' ' + closestDateCulture.calendar.patterns.t;
					}
				return fmt;
				}
			}
		return '';
	},

	getDisplayValue : function( ) {
		if ( this.WTYPE == WIDGET_LABEL ) {
			return this.getText( );
		} else {
			return this.getValue( true, 'LOCAL' );
		}
	},

	getRawValue : function( ) {
		return this.getValue( false, 'SERVER' );
	},

	getSendValue : function( ) {
		return this.getValue( false, 'SEND' );
	},

	setText : function( text ) {
		this.TEXT = text;
	},

	getText : function( ) {
		var txt = this.TEXT;
		return txt;
	},

	getValue : function( display, format ) {
		if ( display && this.isEcho( ) ) {
			return Array( this.RVALUE.length + 1 ).join( this.ECHOCHAR );
		} else {
			if ( this.WTYPE == WIDGET_DATE ) {
				if ( this.dateValue ) {
					var temp = this.dateValue.getDate( format );
					return temp;
				}
				return '';
			} else if ( this.WTYPE == WIDGET_LABEL ) {
				this.TEXT = this.TEXT.replace( /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/gi, '' );
				return this.TEXT;
			} else if ( this.WTYPE == WIDGET_IMAGE ) {
				return this.RVALUE;
			} else {
				// remove/place possible script injections
				this.RVALUE = this.RVALUE.replace( /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/gi, '' );
				return this.RVALUE;
			}
		}
	},

	setValue : function( value, fromServer, setSyncState ) {
		if ( typeof fromServer === 'undefined' ) {
			fromServer = false;
		}

		if ( typeof setSyncState === 'undefined' ) {
			setSyncState = false;
		}

		if ( typeof value === 'undefined' || value === null ) {
			value = '';
		}

		if ( typeof value === 'number' )
			value = '' + value;

		if ( typeof value !== 'string' )
			throw 'invalid data type';

		if ( this.WTYPE === WIDGET_DATE ) {
			var valid = this.dateValue.setDate( value, fromServer );
			if ( valid === true ) {
				value = ( ( value && value.length > 0 ) ? this.dateValue.getDate( 'LOCAL' ) : '' );
				if ( value !== null && value.length > 0 ) {
					if ( isDebugOn( 'WIDGET' ) )
						console.debug( widgetDebug( 'WIDGET', this, 'SET WIDGET_DATE DATE VALUE VALID', 'OLD[' + this.RVALUE + '] TO[' + value + ']' ) );
					this.RVALUE = value;
				} else {
					if ( isDebugOn( 'WIDGET' ) )
						console.debug( widgetDebug( 'WIDGET', this, 'SET WIDGET_DATE DATE VALUE EMPTY', 'OLD[' + this.RVALUE + '] TO[\'\']' ) );
					this.RVALUE = '';
				}
			} else {
				this.RVALUE = '';
				if ( isDebugOn( 'WIDGET' ) )
					console.debug( widgetDebug( 'WIDGET', this, 'SET WIDGET_DATE DATE VALUE FAILURE/INVALID!!', 'BAD FORMATED STRING [' + value + ']' ) );
			}
		} else if ( this.WTYPE === WIDGET_IMAGE ) {
			if ( isDebugOn( 'WIDGET' ) )
				console.debug( widgetDebug( 'WIDGET', this, 'SET IMAGE VALUE', 'LENGTH:' + value.length ) );
			this.RVALUE = value;
		} else if ( this.WTYPE === WIDGET_LABEL ) {
			value = value.replace( /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/gi, '' );
			this.TEXT = value;
			if ( isDebugOn( 'WIDGET' ) )
				console.debug( widgetDebug( 'WIDGET', this, 'SET TEXT VALUE', 'OLD[' + this.TEXT + '] TO [' + value + ']' ) );
		} else {
			// remove/place possible script injections
			value = value.replace( /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/gi, '' );
			if ( isDebugOn( 'WIDGET' ) )
				console.debug( widgetDebug( 'WIDGET', this, 'SET DATA VALUE', 'OLD[' + this.RVALUE + '] TO [' + value + ']' ) );
			this.RVALUE = value;
		}

		if ( setSyncState )
			this.inDisplaySync = true;
	},

	setImage : function( theFile, theBase64, theBinaryData ) {
		if ( this.WTYPE === WIDGET_IMAGE ) {
			this.fileName = theFile;
			this.setValue( theBase64 );
		}
	},

	getOP : function( op ) {
		var oIdx, l;
		for ( oIdx = 0, l = InforMetaExpression.prototype.instOPS.length; oIdx < l; ++oIdx )
			if ( InforMetaExpression.prototype.instOPS[ oIdx ].op == op )
				return InforMetaExpression.prototype.instOPS[ oIdx ].func;

		return null;
	},

	evaluate : function( exp, dflt ) {
		var theTruth = true;
		var vWidget = null;

		var expOR = exp.trim( ).split( '|' );

		var expA, expALength, idx, nExp, func, pLevel, fields, fieldVector, fieldName, op, val1, val2;

		for ( var Oidx = 0, OidxLength = expOR.length; Oidx < OidxLength; ++Oidx ) {
			theTruth = true;
			expA = removeParans( expOR[ Oidx ].trim( ) ).split( '&' );
			for ( idx = 0, expALength = expA.length; idx < expALength && theTruth; ++idx ) {
				try {
					nExp = removeParans( expA[ idx ].trim( ) );
					func = nExp.substring( 0, 5 );
					pLevel = removeParans( nExp.substring( 5, nExp.length ) ).split( ',' );
					op = pLevel[ 2 ] ? pLevel[ 2 ].trim( ) : '=';

					if ( pLevel[ 0 ] && pLevel[ 0 ].indexOf( '->' ) != -1 ) {
						fields = pLevel[ 0 ].split( '->' );
						fieldVector = fields[ 0 ] ? fields[ 0 ].trim( ) : '';
						fieldName = fields[ 1 ] ? fields[ 1 ].trim( ) : '';
						vWidget = this.PARENT.getWidgetByName( fieldName, fieldVector, false );
						if ( !vWidget ) {
							return dflt;
						}
						val1 = vWidget.getRawValue( );
					} else {
						val1 = pLevel[ 0 ];
					}

					if ( pLevel[ 1 ] && pLevel[ 1 ].indexOf( '->' ) != -1 ) {
						fields = pLevel[ 1 ].split( '->' );
						fieldVector = fields[ 0 ] ? fields[ 0 ].trim( ) : '';
						fieldName = fields[ 1 ] ? fields[ 1 ].trim( ) : '';
						vWidget = this.PARENT.getWidgetByName( fieldName, fieldVector, false );
						if ( !vWidget ) {
							return dflt;
						}
						val2 = vWidget.getRawValue( );
					} else {
						val2 = pLevel[ 1 ];
					}

					switch ( func ) {
						case 'EXPRI' : {
							val2 = stringToInt( val2 );
							val1 = stringToInt( val1 );
							break;
						}
						case 'EXPRC' : {
							val2 = '' + val2;
							val2 = val2.trim( );
							val1 = '' + val1;
							val1 = val1.trim( );
							break;
						}
						case 'EXPRF' : {
							val2 = stringToFloat( val2 );
							val1 = stringToFloat( val1 );
							break;
						}
					}
					var operator = this.getOP( op );
					if ( operator )
						theTruth = operator( val1, val2 );

					if ( isDebugOn( 'WIDGET' ) )
						console.debug( widgetDebug( 'WIDGET', this, 'Expression evaluated to', '[' + nExp + '] ' + val1 + op + val2 + '=' + theTruth ) );
				} catch ( err ) {
					theTruth = false;
					console.error( err.stack );
				}
				// AND LOOP, if anything is false stop checking it's all false
			}
			if ( theTruth ) {
				break; // this is the OR loop, if one is true, it's all true
			}
		}
		return theTruth;
	},

	copy : function( obj, shallow ) {
		var key = null;
		var type = null;
		var lObj = null;

		for ( key in obj ) {
			lObj = obj[ key ];
			type = typeof lObj;

			if ( ( shallow === true && type === 'object' ) || type === 'function' )
				continue;
			if ( lObj && lObj.copy ) {
				// anything with a copy function means we have a reference
				// and just assigning it would mean both the original widget and
				// the copy widget will have the same object and not the same value
				this[ key ] = lObj.copy( );
			} else {
				this[ key ] = lObj;
			}
		}
	},

	focus : function( fireFGHandlerOnFocus ) {
		if ( isDebugOn( 'FGS' ) )
			console.debug( widgetDebug( 'FGS', this, 'widget is being given focus. Does it have a FG?', this.FGNAME + "::" + currentScreen.currentFieldGroup ) );
		if ( fireFGHandlerOnFocus != FIRE_FG_HANDLER )
			this.doNotFireFGHandler = true;
		else
			this.doNotFireFGHandler = false;

		layoutDIV.find( '#' + this.ID ).focus( );
	},

	getBoolean : function( value ) {
		if ( value === 'true' || value === '1' || value === 1 ) {
			return 1;
		} else {
			return 0;
		}
	},

	getEditStateDisplayValue : function( doEditState ) {
		var val = '';
		if ( doEditState ) {
			if ( this.PARENT.VALIDATEINPUT && this.WTYPE != WIDGET_LABEL && this.FAKE ) {
				// this is a validateinput widget, the real one. Keep our value but pass back a blank
				// for display. We have to keep the value so visible/editable expressions will function
				if ( isDebugOn( 'WIDGET' ) )
					console.debug( widgetDebug( 'WIDGET', this, 'Widget blank value' ) );
				val = '';
			} else if ( this.EDITSTATE === 0 ) { // blank
				if ( isDebugOn( 'WIDGET' ) )
					console.debug( widgetDebug( 'WIDGET', this, 'Widget blank value' ) );
				val = '';
			} else if ( this.EDITSTATE === 1 || this.EDITSTATE == 3 ) { // default
				if ( isDebugOn( 'WIDGET' ) )
					console.debug( widgetDebug( 'WIDGET', this, 'Widget default value', this.DVALUE ) );
				var tempVal = this.RVALUE;
				this.setValue( this.DVALUE );
				val = this.getDisplayValue( );
				this.RVALUE = tempVal;
			} else if ( this.EDITSTATE === 2 ) { // keep current value
				if ( isDebugOn( 'WIDGET' ) )
					console.debug( widgetDebug( 'WIDGET', this, 'widget will remain unchanged' ) );
				val = this.getDisplayValue( );
			}
		} else {
			val = this.getDisplayValue( );
		}
		return val;
	},

	getBarcodePrefix : function( ) {
		if ( !this.BARCODE_CODE )
			return '';
		else
			return this.BARCODE_CODE;
	},

	reset : function( ) {
		this.inDisplaySync = false;
	},

	dump : function( ) {
		if ( !appConfig.debug.DUMP )
			return null;
		var dbgObj = new InforMetaWidget( );
		dbgObj.copy( this, true );
		return dbgObj;
	},

	getIncomingProperty : function( props, propIdx ) {
		if ( typeof props[ propIdx ] != 'undefined' )
			return props[ propIdx ];
		else
			return null;
	}
};
