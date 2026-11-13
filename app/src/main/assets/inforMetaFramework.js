var inforMetaFrameworkVersion = '11.0.1.0006';

var appConfig = {
	serverURL : null,
	connections : [ ],
	showConnection : 'true',
	autoSelectTextOnFocus : 'false',
	vibrate : false,
	vibratePattern : [ ],
	vibrateOnInputError : false,
	vibrateOnValidationError : false,
	vibrateOnNewMessage : false,
	debug : '',
	remoteDebug : '',
	RFWidth : 20,
	RFHeight : 16,
	isTablet : false, // RF Display vs Tablet Display
	forcedScaleX : null,
	forcedScaleY : null,
	aboutKey : 'F1',
	lookupKey : 'F2',
	msgKey : 'F11',
	itemKey : 'F12',
	navHomeKey : 'undefined',
	startConversationKey : 'F11',
	procPrefix : 'NSPRF',
	commitMessageKey : 'enter',
	itemIMGProcedure : 'nspdrfskuimage',
	saveIMGProc : 'nspdrfsaveimage01',
	facilityTZProc : 'NSPRFMETA03',
	getStringsProc : 'NSPRFMETA02',
	getScreenProc : 'NSPRFMETA01',
	loginProc : 'NSPRFMETAOT08',
	logoutProc : 'NSPRFMETAOT09',
	reconnectProc : 'NSPRFWEBRFOT08',
	getConfigProc : 'NSPRFCG01',
	maxWidth : 240,
	columnWidth : 240,
	maxHeight : 320,
	popMaxWidth : 200,
	popMaxHeight : 300,
	columns : 1,
	rows : 13,
	rowHeight : 22,
	headerHeight : 26,
	footerRowHeight : 26,
	menuRowHeight : 26,
	allowDecimalQty : true,
	maxImageSize : 5000000, // in bytes
	dateFunction : '',
	barcodeConfig : {},
	getServerURL : function( ) {
		var connections = [ ], idx = 0, cs = this.connections, l = cs.length, c = null, url = null;

		for ( ; idx < l; ++idx ) {
			c = cs[ idx ];
			url = c.protocol + "://" + c.server + ( c.port != "80" ? ":" + c.port : "" ) + "/" + c.path;
			connections.push( url );
		}
		return connections;
	}
};

var userConfig = {
	dateFmt : 'short',
	timeFmt : 'short',
	dateTimeFMT : 'short',
	facilityTZ : 0
};

var category = {
	WIDGET : 'WIDGET',
	SOCKET : 'SOCKET',
	SENDMSG : 'SENDMSG',
	SCREEENBUILD : 'SCREENBUILD',
	SCREENFLOW : 'SCREENFLOW',
	LOADDATA : 'LOADDATA',
	EVENT : 'EVENT',
	IMAGE : 'IMAGE',
	MSG : 'MSG'
};

var feeTimer = [ ];
var layoutDIV = null;
var loginDIV = null;
var contentDIV = null;
var headerDIV = null;
var footerDIV = null;
var selectorDIV = null;
var menuDIV = null;

var convDlg = null;
var msgDlg = null;
var userDlg = null;
var dialogOpen = null;
var itemImgDlg = null;
var whseDlg = null;
var aboutDlg = null;
var acceptDialog = null;

var lastOrientation = null;
var lastWidth = null;
var lastHeight = null;

// holds query parameters
var multimap = null;
// Web Socket connection
var ws = null;
// Login screen to start with
var startScreen = 'L1';
// The screen controllers
var controller = null;
// all valid warehouses this logged in user can see
var warehouses = [ ];
// tenant id - from URL parameter?
var tenantName = '';
// logged in user - login id
var userID = '';
// logged in user - full name
var userName = '';
// default locale
var usersLocale = 'en';
// default date locale;
var usersDateLocale = 'en';
// closest culture defined in SOHO to the users locale from OA
var closestCulture = null;
// closest date culture defined in SOHO to users date locale from OA
var closestDateCulture = null;
// id of the web socket connection
var sourceId = '';
// logged in warehouse to work in
var usersWarehouse = '';
// human readable name of the warehouse selected.
var usersWarehouseName = '';
// users meta profile (not SCE profile)
var usersProfile = '';
// device code being used
var deviceCode = '16x20';
// number of times we've checked for a valid connection
var connectionCount = 0;
// if dialogOpen is displaying an error
var errorOpen = false;
// Hash object to store data that needs to be passed between screens
var passedData = {};
// default delimiter to use for passing fields to socket server.
var fieldDelimiter = '`';
// default record separator character
var dataDelimiter = String.fromCharCode( 12 );
// record delimiter
var recDelimiter = String.fromCharCode( 30 );
// parameter delimiter
var parmDelimiter = ",";
// current displayed screen
var currentScreen = null;
// configuration
var config = null;
// flag to stop bubbling up the fieldGroup checking.
var inFieldGroupCheck = false;
// hold an image to upload in hex format.
var tImage = null;

var KEYS = null;
var KEYMAP = {};

var maxScreenHeights = [
	320
];

var sortScreenDataRF = [
		{
			key : 'VPOS'
		}, {
			key : 'HPOS'
		}
];
var sortScreenDataRFVectors = [
		{
			key : 'VTYPE'
		}, {
			key : 'VTYPEPOS'
		}
];

//
// Intermec HTML5 ignores propagation flags in keydown events. If we do cancel
// event propagation, we need to let intermec know to cancel in the keypress event
// which is the only place intermec allows it! DUMB AND inconsistent!
//
var keyCancelHackForIntermecBrowser = false;
var masterKeyHandlerTriggered = false;

window.onerror = function( msg, url, line ) {
	if ( console && console.log )
		console.log( 'uncaught exception!', msg, url, line );

	if ( console && console.error )
		console.error( 'uncaught exception!', msg, url, line );

	alert( 'Script Error:' + msg + ':' + url + ':' + line );
	exitScreen( 5000 );
};

if ( "onhelp" in window ) {
	// IE work around to prevent F1 key from showing windows help.
	window.onhelp = function( event ) {
		event.preventDefault( );
		return false;
	};
}

var forceResize = false;
$( window ).resize( function( ) {
	if ( haveOrientationSupport && !forceResize ) {
		var hgt = $( window ).height( );
		if ( hgt <= lastHeight && window.orientation == lastOrientation ) {
			return; // assume that the keyboard is now displayed, we don't want to resize on that.
		} else if ( window.orientation != lastOrientation ) {
			// orientation has changed. If the keyboard is up, we need it closed.
			// if it stays up the browser window is actually "smaller" and we need the height
			// of the full window on a resize.
			if ( $( ':focus' ).length > 0 ) { // assumes keyboard is up. only way to guess
				$( 'body' ).find( 'input,textarea,select' ).filter( ':visible:first' ).focus( ).blur( ); // force keyboard down
				// forcing keyboard down will trigger a new resize
				// with the proper height values.
				forceResize = true;
				return;
			}
		}
	}

	forceResize = false;
	calcNewDimensions( );
	resizeDialogs( );

	if ( !dialogOpen && currentScreen && !currentScreen.XMITONLY ) {
		currentScreen.buildScreen( true, false, false, false );
	}
} );

var haveOrientationSupport = false;

$( function( ) {
	$( '#login' ).hide( );
	getQueryString( window );

	haveOrientationSupport = typeof window.orientation != 'undefined';
	lastOrientation = haveOrientationSupport ? window.orientation : null;

	if ( typeof console === 'undefined' ) {
		console = {
			debug : function( ) {
			},
			log : function( ) {
			},
			error : function( ) {
			},
			info : function( ) {
			},
			time : function( ) {
			}
		};
	} else {
		if ( typeof console.debug === 'undefined' ) {
			console.debug = function( ) {
			};
		}
		if ( typeof console.error === 'undefined' ) {
			console.error = function( ) {
			};
		}
		if ( typeof console.log === 'undefined' ) {
			console.log = function( ) {
			};
		}
		if ( typeof console.info === 'undefined' ) {
			console.info = function( ) {
			};
		}
	}

	calcNewDimensions( );
	initDialogs( );

	// try and auto detect the users locale settings.
	// unable to detect will give default of en_US unless a query parameter
	// passes in a value
	if ( navigator ) {
		if ( navigator.userLanguage ) // Explorer
			usersLocale = navigator.userLanguage;
		else if ( navigator.language ) // FF
			usersLocale = navigator.language;
	}

	$( document ).ready( function( ) {
		$.ajaxSetup( {
			cache : false
		} );
	} );

	$( document ).data( "webClientConfigLoad", $.Deferred( ) ).ready( function( ) {
		// window.location.port;
		// window.location.hostname;
		// window.location.pathname;
		getURLBase( );
		var configPath = '/' + theID + '/sce/mobile-web-client/config/mobile-web-client.json';
		$.getJSON( configPath, function( data ) {
			config = data;
		} ).fail( function( data, textStatus, error ) {
			console.error( 'json config load fail', data, textStatus, error, error.stack );
			displayPageError( textStatus, function( ) {
				exitScreen( );
			} );
		} ).always( function( data, textStatus, error ) {
			$( document ).data( "webClientConfigLoad" ).resolve( );
			if ( currentScreen )
				currentScreen.enableScreen( );
		} );
	} ).keypress( function( event ) {
		if ( !controller )
			return false;

		try {
			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'keypress start', controller.inProcess( ) + ':' + ( ws ? ws.sending : 'NA' ) ) );
			if ( controller.inProcess( ) )
				return false;

			if ( event.which === 229 || event.which === 0 )
				return;

			return masterKeyPressHandler( event );
		} finally {
			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'keypress end', controller.inProcess( ) + ':' + ( ws ? ws.sending : 'NA' ) + ':' + event.which ) );
		}
	} ).keydown( function( event ) {
		if ( !controller )
			return false;

		try {
			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'keydown start', controller.inProcess( ) + ':' + ( ws ? ws.sending : 'NA' ) + ':' + event.which ) );
			if ( controller.inProcess( ) )
				return false;

			if ( event.which === 229 || event.which === 0 )
				return;

			return masterKeyDownHandler( event );
		} finally {
			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'keydown end', controller.inProcess( ) + ':' + ( ws ? ws.sending : 'NA' + ':' + event.which ) ) );
		}
	} ).keyup( function( event ) {
		if ( appConfig.NFS || event.which == KEYMAP[ "escape" ] )
			return;

		var body = document.documentElement;
		if ( body.requestFullScreen ) {
			body.requestFullScreen( );
		} else if ( body.webkitRequestFullscreen ) {
			body.webkitRequestFullscreen( );
		} else if ( body.mozrequestFullscreen ) {
			body.mozrequestFullscreen( );
		} else if ( body.msRequestFullscreen ) {
			body.msRequestFullscreen( );
		}
	} );

	$.when( $( document ).data( "webClientConfigLoad" ) ).then( function( ) {
		// the app config file has been loaded from the server
		handleConfigData( config );

		$( 'body' ).width( appConfig.maxWidth );
		loginDIV.width( appConfig.maxWidth ).height( appConfig.maxHeight );
		layoutDIV.width( appConfig.maxWidth );

		if ( appConfig.showConnection == 'false' ) {
			$( '#server' ).hide( );
			$( '#serverLabel' ).hide( );
		} else {
			$( '#server' ).val( appConfig.getServerURL( )[ 0 ] ).attr( 'readonly', 'readonly' );
		}

		$( '#port' ).hide( );
		$( '#portLabel' ).hide( );
		$( '#user' ).focus( );

		if ( appConfig.isTablet ) {
			$( '#prevScreenButton' ).show( ).disable( );
			$( '#nextScreenButton' ).show( ).disable( );
		}
		$( '#specialKeysTablet' ).show( );

		getJSONLocaleBase( usersLocale, true );

		startTheController( );
	} );
} );

function loadUserConfig( ) {
	var msg = 'EXEC' + ' ' + appConfig.getConfigProc + ' ' + buildXMITHeader( appConfig.getConfigProc, appConfig.getConfigProc );

	ws.sendMessage( appConfig.getConfigProc, msg, function( cfg ) {
		// strip off all the control parameters from the front of the string.
		var idx = 0, l = 0, key = null, c = null, configData = {};
		var parsed = parseReturnString( cfg );

		if ( parsed.getCode( ) == 9 ) {
			displayPageError( parsed.getMessage( ), function( ) {
				exitScreen( );
			} );
			return;
		}

		c = parsed.getValue( 0 );
		if ( typeof c === 'string' )
			c = JSON.parse( c );

		if ( c ) {
			l = c.length;
			for ( idx = 0; idx < l; ++idx ) {
				for ( key in c[ idx ] )
					;
				configData[ key ] = c[ idx ][ key ];
			}
		}

		if ( isDebugOn( 'CONFIG' ) )
			console.debug( simpleDebug( 'CONFIG', 'loaded common configuration data', makeJSON( configData ) ) );

		handleConfigData( configData );
		handleQueryParameters( );
		loadLocaleStrings( );
	}, null, false );

};

function loadLocaleStrings( ) {
	var localeStrings = [
			'DEFAULT:NoImageSelected', 'DEFAULT:AcceptDialogInput', 'DEFAULT:Accept', 'DEFAULT:PageFooter', 'DEFAULT:ScreenAction', 'DEFAULT:lookupMessage', 'DEFAULT:Error_Image_Capture_Disabled', 'DEFAULT:Error_Image_Not_Found', 'DEFAULT:Error_Image_Server_Error', 'DEFAULT:Error_InvalidMessageReceived', 'DEFAULT:Error_MissingConfigData', 'DEFAULT:Error_InvalidMetaDataFound', 'DEFAULT:Error_InvalidImage', 'DEFAULT:Error_ImageSize', 'DEFAULT:UserDialog_Title', 'DEFAULT:UserDialog_UserSearch', 'DEFAULT:MsgDialog_Title', 'DEFAULT:SystemMenu', 'DEFAULT:SystemMenu_ImageUpload', 'DEFAULT:SystemMenu_Home', 'DEFAULT:ConvDlg_Title', 'DEFAULT:ConvDlg_ReplyButton', 'DEFAULT:ImageUpload_Title', 'DEFAULT:ImageUpload_Storer', 'DEFAULT:ImageUpload_Item', 'DEFAULT:ImageUpload_Uom', 'DEFAULT:ImageUpload_Upload', 'DEFAULT:AboutDialog_Title', 'DEFAULT:KeyMsg_AboutKey', 'DEFAULT:KeyMsg_LookupKey', 'DEFAULT:KeyMsg_ItemKey', 'DEFAULT:KeyMsg_MsgKey', 'DEFAULT:SelectorRecord', 'DEFAULT:SelectorOf',
			'DEFAULT:menumore'
	];
	var sendList = '';
	for ( var idx = 0; idx < localeStrings.length; ++idx ) {
		sendList = sendList + localeStrings[ idx ] + dataDelimiter;
	}

	var msg = 'EXEC ' + appConfig.getStringsProc + ' ' + buildXMITHeader( appConfig.getStringsProc, appConfig.getStringsProc ) + addEncodedDataParameters( usersLocale, sendList );

	ws.sendMessage( appConfig.getStringsProc, msg, function( retTokens ) {
		// strip off all the control parameters from the front of the string.
		var idx = 0, pCodeLength = 0, newMsg = {}, code = null, display = null;

		var parsed = parseReturnString( retTokens );
		var parsedCodes = parsed.getValue( 0 ).split( '`' );
		for ( idx = 0, pCodeLength = parsedCodes.length - 1; idx < pCodeLength; idx = idx + 2 ) {
			code = parsedCodes[ idx ].split( '~' );
			display = parsedCodes[ idx + 1 ].split( '~' );
			code = code[ 1 ].substring( 8 ); // strip off DEFAULT:
			display = display[ 1 ];
			newMsg[ code ] = display;
		}
		if ( isDebugOn( "CONFIG" ) )
			console.debug( simpleDebug( 'CONFIG', 'localization strings loaded', makeJSON( newMsg ) ) );
		Globalize.addCultureInfo( closestCulture.name, {
			"messages" : newMsg
		} );
		Globalize.culture( closestCulture );
		localizePages( );
		currentScreen.enableScreen( );
		whseDlg.inforOpen( );
	}, null, false );
}

function loadConfigSettings( data ) {
	try {
		if ( typeof data === 'string' ) {
			data = JSON.parse( data );
		}

		if ( typeof data.default_locale === 'string' ) {
			usersLocale = data.default_locale;
		}

		if ( typeof data.parameterDelimiter === 'string' )
			parmDelimiter = data.parameterDelimiter;
		if ( typeof data.fieldDelimiter === 'string' )
			fieldDelimiter = data.fieldDelimiter;

		setConfigBooleanValue( data.showConnection, 'showConnection', false );
		setConfigBooleanValue( data.autoSelectTextOnFocus, 'autoSelectTextOnFocus', true );
		setConfigBooleanValue( data.allowDecimalInQty, 'allowDecimalQty', true );

		if ( typeof data.tenant === 'string' && !isBlank( data.tenant ) ) {
			tenantName = data.tenant;
		}

		setConfigBooleanValue( data.vibrate, 'vibrate', true );
		setConfigArrayValue( data.vibratePattern, 'vibratePattern', [
			1000
		] );
		setConfigBooleanValue( data.vibrateOnInputError, 'vibrateOnInputError', true );
		setConfigBooleanValue( data.vibrateOnValidationError, 'vibrateOnValidationError', true );
		setConfigBooleanValue( data.vibrateOnNewMessage, 'vibrateOnNewMessage', true );

		setConfigBooleanValue( data.remote_debug, 'remoteDebug', false );

		setConfigIntegerValue( data.maxCol, 'RFWidth', appConfig.RFWidth );
		setConfigIntegerValue( data.maxRow, 'RFHeight', appConfig.RFHeight );
		setConfigIntegerValue( data.rowHeight, 'rowHeight', appConfig.rowHeight );
		setConfigIntegerValue( data.maxImageSize, 'maxImageSize', appConfig.maxImageSize );

		setConfigStringValue( data.dateFunction, 'dateFunction', appConfig.dateFunction );
		setConfigObjectValue( data.barcodeConfig, 'barcodeConfig', {} );

		setConfigStringValue( data.debug, 'debug', appConfig.debug );
		setConfigStringValue( data.about_key, 'aboutKey', appConfig.aboutKey );
		setConfigStringValue( data.lookup_key, 'lookupKey', appConfig.lookupKey );
		setConfigStringValue( data.item_key, 'itemKey', appConfig.itemKey );
		setConfigStringValue( data.nav_home_key, 'navHomeKey', appConfig.navHomeKey );
		setConfigStringValue( data.commit_msg_key, 'commitMessageKey', appConfig.commitMessageKey );
		setConfigStringValue( data.start_conv_key, 'startConversationKey', appConfig.startConversationKey );
		setConfigStringValue( data.item_img_proc, 'itemIMGProcedure', appConfig.itemIMGProcedure );
		if ( appConfig.itemIMGProcedure.startsWith( 'http' ) ) {
			appConfig.imageHTTP = true;
		} else {
			appConfig.imageHTTP = false;
		}

		if ( typeof data.KEYS === 'object' && data.KEYS.length ) {
			KEYS = data.KEYS;

			var idx = 0;
			var size = KEYS.length;
			var key;
			for ( ; idx < size; ++idx ) {
				key = KEYS[ idx ];
				KEYMAP[ parseInt( key.code ) ] = key.key;
				KEYMAP[ key.key ] = parseInt( key.code );
			}
		}

		handleQueryParameters( );
	} catch ( e ) {
		if ( isDebugOn( 'ERROR' ) )
			console.error( e );
		displayPageError( e, function( ) {
			exitScreen( );
		} );
	}
};

var theBase = null;
var theID = null;
function getURLBase( ) {
	for ( var idx = 0; idx < document.scripts.length && !theBase; ++idx ) {
		var s = document.scripts[ idx ];
		if ( s.src.indexOf( 'mobile-web-client' ) != -1 ) {
			var p = s.src.split( '/' );
			for ( var pIdx = 0; pIdx < p.length && !theBase; ++pIdx ) {
				if ( p[ pIdx ].substring( 0, 4 ) === 'svc_' ) {
					theBase = p[ pIdx ];
					theID = theBase.substring( 4 );
				}
			}
		}
	}

	return theBase;
}

function getJSONLocaleBase( locale, update ) {
	// step1 is to load the basic locales file that contains the extra values
	// SOHO does have that OA would require.
	var path = '/' + getURLBase( ) + '/app/mobile-web-client/locales.json';

	$( document ).data( "documentAndTranslationDeferred", $.Deferred( ) ).ready( function( ) {
		$.getJSON( path, function( data ) {
			// data should be an array of objects.
			var rec = null;
			for ( var idx = 0, l = data.length; idx < l; ++idx ) {
				rec = data[ idx ];
				if ( !rec.base )
					rec.base = "default";
				Globalize.addCultureInfo( rec.locale, rec.base, rec.data );
			}
			
			// SOHO + WMS format conflicts.
			// basically turn 12 hour clock to 24 hour clock dates.
			// hh:mm tt => H:mm
			for (var culture in Globalize.cultures) {
				culture = Globalize.cultures[ culture ];
				culture.calendars.standard.patterns.t = culture.calendars.standard.patterns.t.replace('hh:','H:');
				culture.calendars.standard.patterns.t = culture.calendars.standard.patterns.t.replace('h:','H:');
				culture.calendars.standard.patterns.t = culture.calendars.standard.patterns.t.replace(' tt','');
				culture.calendars.standard.patterns.t = culture.calendars.standard.patterns.t.replace('tt ','');
			}
		} ).fail( function( data, textStatus, error ) {
			console.error( 'json load fail of add on locales', data, textStatus, error.stack );
		} ).always( function( data, textStatus, error ) {
			$( document ).data( "documentAndTranslationDeferred" ).resolve( );
			getJSONLocaleEnglish( locale, update );
		} );
	} );
}

function getJSONLocaleEnglish( locale, update ) {
	// step 2 load in the english translations. These are used as fall backs in case the users locale
	// is missing translations.
	getURLBase( );
	var path = '/' + theID + '/sce/mobile-web-client/translation/en.json';

	// now that we have the app config, get the localization information
	$( document ).data( "documentAndTranslationDeferred", $.Deferred( ) ).ready( function( ) {
		$.getJSON( path, function( data ) {
			Globalize.addCultureInfo( 'en', data );
		} ).fail( function( data, textStatus, error ) {
			$( document ).data( "documentAndTranslationDeferred" ).resolve( );
			displayPageError( textStatus, function( ) {
				exitScreen( );
			} );
		} ).success( function( data, textStatus, error ) {
			$( document ).data( "documentAndTranslationDeferred" ).resolve( );
			getJSONLocaleUser( locale, update, null );
		} );
	} );
}

function getJSONLocaleUser( locale, update, callback ) {
	var tLocale = locale;

	if ( tLocale.indexOf( '-' ) != -1 ) {
		tLocale = tLocale.replace( /-/gi, '_' );
	}

	var path = '/' + theID + '/sce/mobile-web-client/translation/' + tLocale + '.json';

	// now that we have the app config, get the localization information
	$( document ).data( "documentAndTranslationDeferred", $.Deferred( ) ).ready( function( ) {
		$.getJSON( path, function( data ) {
			findClosestCulture( usersLocale, update );
			if ( !closestCulture ) {
				// if we still can't get a locale BOOM error and fail out.
				// alternative would be go with English, reload the EN json file
				// and go.......
				displayPageError( SCElocalize( 'Error_MissingConfigData' ), function( ) {
					exitScreen( );
				} );
			} else {
				var closestCultureName = closestCulture.name;
				Globalize.addCultureInfo( closestCultureName, data );
				localizePages( );
				if ( !controller )
					controller = new InforMetaScreenController( );
				controller.start( startScreen );
				if ( callback ) {
					callback( );
				}
			}
		} ).fail( function( data, textStatus, error ) {
			$( document ).data( "documentAndTranslationDeferred" ).resolve( );

			if ( tLocale.indexOf( '_' ) != -1 ) {
				var temp = tLocale.split( '_' );
				tLocale = temp[ 0 ];
				for ( var idx = 1; idx < temp.length - 1; ++idx ) {
					tLocale += '_' + temp[ idx ];
				}
				getJSONLocaleUser( tLocale, update, callback );
			} else {
				displayPageError( textStatus, function( ) {
					exitScreen( );
				} );
			}
		} ).always( function( data, textStatus, error ) {
			$( document ).data( "documentAndTranslationDeferred" ).resolve( );
			resizeDialogs( );
			if ( currentScreen )
				currentScreen.enableScreen( );
		} );
	} );
}

function findClosestDateCulture( theLocale, update ) {
	if ( !theLocale )
		theLocale = usersDateLocale;

	var tCulture = Globalize.findClosestCulture( theLocale.replace( /_/gi, '-' ) );

	if ( !tCulture && theLocale === 'zh' ) {
		// hardcoded check for Chinese. findClosestCulture will fail
		// if the usersLocale is NOT set to zh-CN or zh-TW
		// we'll probably get here just after loggining into to SCE
		// and it's locale for this user came back as just zh and not
		// zh-CN while the DATEFMT OA gives us IS zh_CN so try that
		theLocale = usersDateLocale ? usersDateLocale : 'zh_CN';
		tCulture = Globalize.findClosestCulture( theLocale.replace( /_/gi, '-' ) );
	} else if ( !tCulture ) {
		var idx = theLocale.indexOf( '_' );
		if ( idx != -1 ) {
			theLocale = theLocale.substring( 0, idx );
			return findDateClosestCulture( theLocale, update );
		}
	} else {
		if ( update ) {
			usersDateLocale = tCulture.name;
			closestDateCulture = tCulture;

			controller.dateSep = closestDateCulture.calendar[ '/' ];
			controller.timeSep = closestDateCulture.calendar[ ':' ];
			controller.dateFmt = closestDateCulture.calendar.patterns.d;
			controller.dateFmtA = controller.dateFmt.split( this.dateSep );
			controller.timeFmt = sanitizeTimeFormats( closestDateCulture.calendar.patterns.t );
			controller.timeFmtA = controller.timeFmt.split( this.timeSep );
			controller.dateTimeFmt = controller.dateFmt + ' ' + controller.timeFmt;

			var idx;
			for ( idx = 0; idx < controller.timeFmtA.length; ++idx ) {
				if ( controller.timeFmtA[ idx ] === 'H' )
					controller.timeFmtA[ idx ] = 'HH';
				else if ( controller.timeFmtA[ idx ] === 'h' )
					controller.timeFmtA[ idx ] = 'hh';
			}

			for ( idx = 0; idx < controller.dateFmtA.length; ++idx ) {
				if ( controller.dateFmtA[ idx ] === 'M' )
					controller.dateFmtA[ idx ] = 'MM';
				else if ( controller.dateFmtA[ idx ] === 'd' )
					controller.dateFmtA[ idx ] = 'dd';
			}
		}
	}

	return tCulture;
}

function findClosestCulture( theLocale, update ) {
	if ( !theLocale )
		theLocale = usersLocale;

	var tCulture = Globalize.findClosestCulture( theLocale.replace( /_/gi, '-' ) );

	if ( !tCulture && theLocale === 'zh' ) {
		// hardcoded check for Chinese. findClosestCulture will fail
		// if the usersLocale is NOT set to zh-CN or zh-TW
		// we'll probably get here just after loggining into to SCE
		// and it's locale for this user came back as just zh and not
		// zh-CN while the DATEFMT OA gives us IS zh_CN so try that
		theLocale = userConfig.dateTimeFmt ? userConfig.dateTimeFmt : 'zh_CN';
		tCulture = Globalize.findClosestCulture( theLocale.replace( /_/gi, '-' ) );
	} else if ( !tCulture ) {
		var idx = theLocale.indexOf( '_' );
		if ( idx != -1 ) {
			theLocale = theLocale.substring( 0, idx );
			return findClosestCulture( theLocale, update );
		}
	} else {
		if ( update ) {
			usersLocale = tCulture.name;
			closestCulture = tCulture;
		}
	}

	return tCulture;
}

function masterKeyPressHandler( event ) {

	//
	// for intermec HTML5 browsers. They bypass key down events when scanning.
	//
	var doKeyDownLogic = !masterKeyHandlerTriggered;
	masterKeyHandlerTriggered = false;

	// normal browsers will never get here if we canceled the key event in keydown
	if ( keyCancelHackForIntermecBrowser ) {
		keyCancelHackForIntermecBrowser = false;
		event.preventDefault( );
		return false;
	}

	//
	// for widgets with UPPER flags set, convert the typed characters to upper case
	//
	var obj = $( event.target );
	var key = String.fromCharCode( event.which );
	var widget = InforMetaWidget.getWidgetFromJQueryObject( obj );

	if ( isDebugOn( "KEYEVENT" ) )
		console.debug( simpleDebug( 'KEYEVENT', 'keypress', 'KEY:' + key + ':VAL:' + obj.val( ) ) );

	if ( widget && widget.WTYPE != WIDGET_CHOICE && !iscntrl( key ) ) {
		if ( isDebugOn( "KEYEVENT" ) )
			console.debug( simpleDebug( 'KEYEVENT', 'keypress', 'does scan char get here?' ) );

		if ( widget.UPPER ) {
			key = key.toUpperCase( );
		}

		if ( event.which >= 97 ) {
			// if we're dealing with ECHOCHAR logic, that's all handled in
			// the InforMetaScreen.handleKeyUp function
			var selected = getSelectedText( $( event.target ) );
			var val = obj.val( );
			if ( selected && selected.length > 0 ) {
				var idx = val.indexOf( selected );
				val = val.substring( 0, idx ) + key + val.substring( idx + selected.length );
				key = '';
				obj.val( val );
				widget.setValue( obj.val( ) );
				// IE bullshit
				var ieVal = obj.val( );
				obj[ 0 ].selectionStart = ieVal.length;
				obj[ 0 ].selectionEnd = ieVal.length;
			} else {
				if ( !widget.isEcho( ) ) {
					obj.val( val + key );
					widget.setValue( obj.val( ) );
				}
			}
			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'keypress', 'EXIT:WIDGET:' + widget.getRawValue( ) + ':VAL:' + obj.val( ) ) );
			return false;
		} else {
			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'keypress', 'EXIT:WIDGET:' + widget.getRawValue( ) + ':VAL:' + obj.val( ) ) );

			if ( doKeyDownLogic ) {
				if ( isDebugOn( "KEYEVENT" ) )
					console.debug( simpleDebug( 'KEYEVENT', 'keypress', 'Do key down logic here:[' + obj.val( ) + ']' ) );
				obj.val( obj.val( ) + key );
				widget.setValue( obj.val( ) );
				return false;
			}
		}
	}

	return true;
}

function masterKeyDownHandler( e ) {
	keyCancelHackForIntermecBrowser = false;
	masterKeyHandlerTriggered = true;

	if ( controller.lockInProcess( ) ) {
		// we got the lock.
		if ( isDebugOn( "KEYEVENT" ) )
			console.debug( simpleDebug( 'KEYEVENT', 'keydown', 'KEY:' + e.which + ":process:" + controller.inProcess( ) ) );
		try {
			if ( dialogOpen ) {
				if ( dialogOpen.inforHandleKeyPress ) {
					return dialogOpen.inforHandleKeyPress( e );
				} else {
					return true;
				}
			} else if ( !currentScreen || ( currentScreen && currentScreen.screenName == "L1" ) ) {
				// /still on the login screen.
				if ( e.which == KEYMAP[ 'enter' ] || e.which == KEYMAP[ 'tab' ] ) {
					e.preventDefault( );
					var status = nextField( e.shiftKey );
					if ( status > 0 ) {
						if ( !ws ) {
							connectionCount = 0;
							currentScreen.disableScreen( );
							startTheController( );
						} else {
							controller.nextScreen( InforMetaScreen.EXIT_NEXT, status );
						}
					}
					return false;
				}
				return true;
			} else {
				// normal screen processing here.
				if ( currentScreen ) {
					if ( !currentScreen.inforHandleKeyPress( e ) ) {
						keyCancelHackForIntermecBrowser = true;
						e.stopPropagation( );
						return false;
					} else {
						var cwidget = InforMetaWidget.getWidgetFromJQueryObject( $( ':focus' ) );
						if ( cwidget && cwidget.isReadonly( ) )
							return false;
						else
							return true;
					}
				}
				return true;
			}
		} finally {
			if ( !ws || !ws.socket || !ws.sending ) {
				if ( isDebugOn( "KEYEVENT" ) )
					console.debug( screenDebug( "KEYEVENT", currentScreen, "keydown end", "clearing in process" ) );
				controller.clearInProcess( );
			}
		}
	}
}

function getScreenMaxHeight( ) {
	var newHgt = 0;
	var hgt = $( window ).height( );
	hgt = window.innerHeight;
	for ( var idx = 0, l = maxScreenHeights.length; idx < l; ++idx ) {
		newHgt = maxScreenHeights[ idx ];
		if ( newHgt >= hgt ) {
			if ( idx !== 0 ) {
				newHgt = maxScreenHeights[ idx - 1 ];
			}
			break;
		}
	}

	return newHgt;
}

function initDialogs( ) {
	layoutDIV = $( '#layoutDIV' );
	loginDIV = $( '#login' );
	contentDIV = $( '#layoutContent' );
	headerDIV = $( '#headerDIV' );
	footerDIV = $( '#footerDIV' );
	selectorDIV = $( '#selectorDIV' );

	initSystemMenuDialog( );
	initConversationDisplayDialog( );
	initUserDisplayDialog( );
	initMessageDisplayDialog( );
	initWhseSelectDialog( );
	initAboutDialog( );
	initAcceptDialog( );

	$( '#aboutDialog, #warehouseSelectDialog, #conversationDialog, #userLookupDialog, #messagesDialog, #itemImgDialog, #uploadDIV, #menuDialog' ).find( '.inforCloseButton' ).click( function( e ) {
		if ( dialogOpen ) {
			if ( typeof dialogOpen.inforClose === 'function' ) {
				dialogOpen.inforClose( {
					prePostProcess : true
				} ); // processes all afterClose events!
			} else {
				dialogOpen.hide( );
				dialogOpen = null;
			}
		}
	} );
}

function initItemImageDisplayDialog( ) {
	//
	// displays image for a configured owner/item
	//
	itemImgDlg = $( '#itemImgDialog' );
	itemImgDlg.inforClose = inforCloseDialog;
	itemImgDlg.afterCloseDialog = function( ) {
		if ( currentScreen )
			currentScreen.enableScreen( );
	};
	itemImgDlg.inforOpen = inforOpenDialog;
	itemImgDlg.inforHandleKeyPress = function( e ) {
		// any key press, close item screen and return to opening screen
		// do not let key stroke bubble up from here or the calling screen gets it
		itemImgDlg.inforClose( {
			prePostProcess : true
		} );
		e.preventDefault( );
		return false;
	};
}

function initMessageDisplayDialog( ) {
	msgDlg = $( '#messagesDialog' );
	msgDlg.inforClose = inforCloseDialog;
	msgDlg.beforeOpenDialog = function( ) {
		if ( userConfig.msgsec < 0 )
			return false;
		return true;
	};
	msgDlg.afterCloseDialog = function( ) {
		contentDIV.show( ).focus( );
		if ( currentScreen ) {
			currentScreen.enableScreen( );
			currentScreen.setFirstFieldFocus( );
		}
	};
	msgDlg.inforOpen = inforOpenDialog;
	msgDlg.afterOpenDialog = function( ) {
		contentDIV.hide( );
		buildMessagesDialog( );
		checkNewMessages( );
		moveThisToTheFront( msgDlg );
	};
	msgDlg.inforHandleKeyPress = function( e ) {
		if ( e.which == KEYMAP[ appConfig.startConversationKey ] ) {
			if ( userConfig.msgsec > 1 ) {
				msgDlg.inforClose( {
					prePostProcess : false
				} );
				userDlg.inforOpen( );
			}
			e.preventDefault( );
			return false;
		} else if ( e.which == KEYMAP[ 'escape' ] ) {
			msgDlg.inforClose( {
				prePostProcess : true
			} );
			e.preventDefault( );
			return false;
		}

		var selected = msgDlg.find( '.SCE-Meta-ConversationContainer.selected' );

		if ( selected.length > 0 ) {
			switch ( e.which ) {
				case KEYMAP[ 'left' ] :
				case KEYMAP[ 'up' ] :
				case KEYMAP[ 'KEY4' ] :
				case KEYMAP[ 'NUM4' ] : {
					// move focus UP
					var prev = selected.prev( );
					if ( prev.length > 0 && prev.hasClass( 'SCE-Meta-ConversationContainer' ) ) {
						selected.removeClass( 'selected' );
						prev.addClass( 'selected' );
					}
					break;
				}
				case KEYMAP[ 'tab' ] :
				case KEYMAP[ 'right' ] :
				case KEYMAP[ 'down' ] :
				case KEYMAP[ 'KEY6' ] :
				case KEYMAP[ 'NUM6' ] : {
					// move focus down
					var next = selected.next( );
					if ( next.length > 0 && next.hasClass( 'SCE-Meta-ConversationContainer' ) ) {
						selected.removeClass( 'selected' );
						next.addClass( 'selected' );
					}
					break;
				}
				case KEYMAP[ 'enter' ] : {
					var convID = selected.find( '.convid' ).html( );
					msgDlg.inforClose( {
						prePostProcess : false
					} );
					convDlg.inforOpen( {
						prePostProcess : true,
						afterData : convID
					} );
					break;
				}

			}
		} else {
			msgDlg.find( '.SCE-Meta-ConversationContainer' ).first( ).addClass( 'selected' );
		}

		e.preventDefault( );
		return false;
	};

	msgDlg.find( '#newReceipent' ).click( function( ) {
		msgDlg.inforClose( {
			prePostProcess : false
		} );
		userDlg.inforOpen( );
	} );
}

function initSystemMenuDialog( ) {
	menuDIV = $( '#menuDialog' );
	menuDIV.inforClose = inforCloseDialog;
	menuDIV.inforOpen = inforOpenDialog;
	menuDIV.inforHandleKeyPress = function( evt ) {
		switch ( evt.which ) {
			case KEYMAP[ 'KEY0' ] :
			case KEYMAP[ 'NUM0' ] : {
				menuDIV.inforClose( );
				navigateHomeMenu( );
				break;
			}
			case KEYMAP[ 'KEY1' ] :
			case KEYMAP[ 'NUM1' ] : {
				menuDIV.inforClose( );
				openImageCapture( );
				break;
			}
			case KEYMAP[ 'escape' ] : {
				menuDIV.inforClose( );
				break;
			}
		}

		evt.preventDefault( );
		return false;
	};
}

function initWhseSelectDialog( ) {
	whseDlg = $( '#warehouseSelectDialog' );
	whseDlg.inforClose = inforCloseDialog;
	whseDlg.beforeCloseDialog = function( ) {
		if ( usersWarehouse.length == 0 ) {
			return false; // no warheouse picked. can't close
		}
		return true;
	};
	whseDlg.inforOpen = inforOpenDialog;
	whseDlg.beforeOpenDialog = function( ) {
		var scr = controller.screens[ 'LL1' ];
		if ( scr )
			delete scr.LL1DONE;
		scr = controller.screens[ 'SND00' ];
		if ( scr )
			delete scr.SND00DONE;

		whseDlg.maxDGroup = parseInt( warehouses.length / 3 / 9 );

		var html = '', mIdx = 0, rIdx = 0, key = 0, style1 = ';', style2 = style1 + 'display:none;';
		$( "#warehouseDialogContent" ).html( '' );
		for ( var idx = 0; idx < warehouses.length; idx = idx + 3 ) {
			mIdx = parseInt( ( idx + 1 ) / 3 );
			rIdx = parseInt( ( idx + 1 ) / 3 / 9 );
			key = mIdx - ( rIdx * 9 );
			html = '<button type="button" dgroup="' + rIdx + '" class="inforTextButton SCE-Meta-LayoutWarehouseMenu" style="' + ( rIdx == 0 ? style1 : style2 ) + '" onclick="currentScreen.handleWarehouseSelection(\'' + idx + '\')">' + key + ' - ' + warehouses[ idx + 2 ] + '</button>';
			$( "#warehouseDialogContent" ).append( html );
			if ( whseDlg.maxDGroup > 0 && key === 8 ) {
				html = '<button type="button" dgroup="' + rIdx + '" class="inforTextButton SCE-Meta-LayoutWarehouseMenu" style="' + ( rIdx == 0 ? style1 : style2 ) + '" onclick="whseDlg.inforHandleNextMenu(true);">9 - ' + SCElocalize( 'menumore' ) + '</button>';
				$( "#warehouseDialogContent" ).append( html );
			}
		}
		return true;
	};
	whseDlg.inforHandleNextMenu = function( forward ) {
		var dgroup = $( "#warehouseDialogContent" ).find( 'button:visible' ).first( ).attr( 'dgroup' );
		dgroup = parseInt( dgroup );
		var ndgroup = dgroup;

		if ( forward && dgroup < whseDlg.maxDGroup ) {
			ndgroup = dgroup + 1;
		} else if ( !forward && dgroup > 0 ) {
			ndgroup = dgroup - 1;
		}
		$( "#warehouseDialogContent" ).find( 'button[dgroup=' + dgroup + ']' ).hide( );
		$( "#warehouseDialogContent" ).find( 'button[dgroup=' + ndgroup + ']' ).show( );
	};
	whseDlg.inforHandleKeyPress = function( evt ) {
		if ( ( evt.which >= KEYMAP[ 'KEY0' ] && evt.which <= KEYMAP[ 'KEY9' ] ) || ( evt.which >= KEYMAP[ 'NUM0' ] && evt.which <= KEYMAP[ 'NUM9' ] ) ) {
			try {
				var dgroup = $( "#warehouseDialogContent" ).find( 'button:visible' ).first( ).attr( 'dgroup' );
				if ( whseDlg.maxDGroup > 0 && ( evt.which === KEYMAP[ 'KEY9' ] || evt.which === KEYMAP[ 'NUM9' ] ) ) {
					whseDlg.inforHandleNextMenu( true );
				} else {
					var keyValue = evt.which >= KEYMAP[ 'KEY0' ] && evt.which <= KEYMAP[ 'KEY9' ] ? ( evt.which - KEYMAP[ 'KEY0' ] ) : ( evt.which - KEYMAP[ 'NUM0' ] );
					keyValue = ( keyValue * 3 ) + ( dgroup * 27 );
					if ( !warehouses[ keyValue ] )
						return true;

					evt.preventDefault( );
					currentScreen.handleWarehouseSelection( keyValue, true );
				}
			} catch ( err ) {
				console.error( 'warehouse select dialog error', err, err.stack );
			}
			return false;
		} else if ( evt.which == KEYMAP[ "escape" ] ) {
			var dgroup = $( "#warehouseDialogContent" ).find( 'button:visible' ).first( ).attr( 'dgroup' );
			if ( dgroup === 0 )
				exitScreen( );
			else
				whseDlg.inforHandleNextMenu( false );
		}
	};
}

function initAboutDialog( ) {
	aboutDlg = $( '#aboutDialog' );
	aboutDlg.inforClose = inforCloseDialog;
	aboutDlg.afterCloseDialog = function( ) {
		currentScreen.enableScreen( );
	};
	aboutDlg.inforOpen = inforOpenDialog;
	aboutDlg.beforeOpenDialog = function( ) {
		var lookupHTML = '';
		if ( currentScreen.hasLookupField ) {
			lookupHTML = '<label class="inforLabel noColon SCE-Meta-LayoutWidget label large" style="top: initial; left: initial; width: 100%; position: relative;">' + appConfig.lookupKey + '=' + SCElocalize( 'KeyMsg_LookupKey' ) + '</label>';
		}
		var dbgString = '';
		if ( isDebugOn( 'DEBUG' ) )
			dbgString = '<label class="inforLabel noColon SCE-Meta-LayoutWidget label large" style="top: initial; left: initial; width: 100%; position: relative;">' + versionInformation( ) + '</label>';

		aboutDlg.find( '#dialogContent' ).html( '' ).append( '<label class="inforLabel noColon SCE-Meta-LayoutWidget label large" style="top: initial; left: initial; width: 100%; position: relative;">' + currentScreen.screenName + '</label>' ).append( '<label class="inforLabel noColon SCE-Meta-LayoutWidget label large" style="top: initial; left: initial; width: 100%; position: relative;">' + usersWarehouseName + '</label>' ).append( '<label class="inforLabel noColon SCE-Meta-LayoutWidget label large" style="top: initial; left: initial; width: 100%; position: relative;">' + appConfig.aboutKey + '=' + SCElocalize( 'KeyMsg_AboutKey' ) + '</label>' ).append( lookupHTML ).append( footerDIV.html( ) ).append( '<label class="inforLabel noColon SCE-Meta-LayoutWidget label large" style="top: initial; left: initial; width: 100%; position: relative;">' + appConfig.msgKey + '=' + SCElocalize( 'KeyMsg_MsgKey' ) + '</label>' );

		if ( currentScreen.hasItemKeyConfigured( ) )
			aboutDlg.find( '#dialogContent' ).append( '<label class="inforLabel noColon SCE-Meta-LayoutWidget label large" style="top: initial; left: initial; width: 100%; position: relative;">' + appConfig.itemKey + '=' + SCElocalize( 'KeyMsg_ItemKey' ) + '</label>' );

		aboutDlg.find( '#dialogContent' ).append( dbgString );
		aboutDlg.find( '#dialogContent' ).find( '.SCE-Meta-LayoutWidget' ).removeClass( 'small footer' ).addClass( 'large' ).css( {
			width : '100%',
			position : 'relative',
			top : 'initial',
			left : 'initial'
		} );
		// the status overlay used to disable the screen wants to always be on top.
		// push it down so this dialog shows on top of it.
		$( '.inforOverlay' ).css( {
			'z-index' : 9998
		} );
		return true;
	};
	aboutDlg.inforHandleKeyPress = function( evt ) {
		aboutDlg.inforClose( );
		if ( evt.which >= KEYMAP[ 'F1' ] && evt.which <= KEYMAP[ 'F24' ] ) {
			// F1 through F12 function keys can exist on all screens
			controller.handleFKeyPress( evt.which );
		}

		// don't let the popup dialog pass key events on to anything else. buck stops here.
		evt.preventDefault( );
		return false;
	};

}

function initConversationDisplayDialog( ) {
	convDlg = $( '#conversationDialog' );
	convDlg.inforClose = inforCloseDialog;
	convDlg.afterCloseDialog = function( ) {
		msgDlg.inforOpen( );
	};
	convDlg.inforOpen = inforOpenDialog;
	convDlg.afterOpenDialog = function( args ) {
		var convID = typeof args !== 'object' ? args : args.convID;
		var newUser = typeof args === 'object' ? args.newUser : undefined;
		var newUserName = typeof args === 'object' ? args.newUserName : undefined;

		convDlg.find( '#hiddenConvID' ).val( convID );
		if ( newUser ) {
			convDlg.find( '#hiddenNewUser' ).val( newUser );
			convDlg.find( '#hiddenNewUserName' ).val( newUserName );
		} else {
			convDlg.find( '#hiddenNewUser' ).val( '' );
			convDlg.find( '#hiddenNewUser' ).val( '' );
		}
		buildConvDialog( convDlg );
		convDlg.focus( ).find( '#daMsg' ).focus( );

		var content = convDlg.find( '.inforDialogContent' );
		scrollToNav( content, content.find( '.SCE-Meta-MsgText' ).last( ) );
	};
	convDlg.inforHandleKeyPress = function( e ) {
		switch ( e.which ) {
			case KEYMAP[ 'escape' ] : {
				convDlg.inforClose( {
					prePostProcess : true
				} );
				e.preventDefault( );
				return false;
				break;
			}
			case KEYMAP[ appConfig.commitMessageKey ] : {
				try {
					var daMsg = convDlg.find( '#daMsg' );
					var msgContent = daMsg.val( ).replace( /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/gi, '' );
					if ( typeof msgContent === 'string' && ! ( ( /^\s*$/ ).test( msgContent ) ) ) {
						var convID = $( '#hiddenConvID' ).val( );
						var newUser = $( '#hiddenNewUser' ).val( );
						var newUserName = $( '#hiddenNewUserName' ).val( );
						var newConvID = InforUserMsg.addMessageToConversation( convID, msgContent, newUserName, newUser && newUser.length > 0 ? newUser : InforUserMsg.getGroupFromConvID( convID ), true );
						$( '#hiddenConvID' ).val( newConvID );

						if ( convID != "-1" ) {
							var html = InforUserMsg.createMessageEntry( convID );
							convDlg.find( '.inforDialogContent' ).html( html );
						} else {
							var html = '<div class="SCE-Meta-MsgText receiver" >' + '<div class="name">' + ( userName.length > 0 ? userName : userID ) + '</div>' + '<div class="text">' + msgContent + '</div>' + '</div>';
							convDlg.find( '.inforDialogContent' ).html( html );
						}
						daMsg.val( '' );
					}
				} finally {
					controller.clearInProcess( );
				}
				// it's here to prevent the value of this key from going into the input field.
				e.preventDefault( );
				return false;

			}
		}
		return true;
	};
}

function initUserDisplayDialog( ) {
	userDlg = $( '#userLookupDialog' );
	userDlg.inforClose = inforCloseDialog;
	userDlg.afterCloseDialog = function( ) {
		msgDlg.inforOpen( );
	};
	userDlg.inforOpen = inforOpenDialog;
	userDlg.beforeOpenDialog = function( ) {
		if ( userConfig.msgsec < 2 )
			return false;

		userDlg.find( '.inforDialogContent' ).html( '' ).height( appConfig.maxHeight - 110 );
		var callback = function( data ) {
			var idx = 0, size = 0, user = null, userN = null, status = null;
			var html = '';
			var retData = data.split( ',' );
			var users = retData[ 9 ];
			if ( users ) {
				users = decode( users ).split( fieldDelimiter );
				size = users.length - 1; // -1 because there will be one blank at the end we need to ignore.
				idx = 0;
				for ( ; idx < size; idx += 3 ) {
					user = users[ idx ];
					if ( user == userID || ( typeof users[ idx + 3 ] !== 'undefined' && user == users[ idx + 3 ] ) )
						continue;

					userN = users[ idx + 1 ];
					status = users[ idx + 2 ];
					if ( user && user.length > 0 ) {
						var icon = 'icon rf';
						if ( status == 'OFFLINE' )
							icon = 'icon offline';
						html = html + '<div class="SCE-Meta-UserContainer">' + '<div class="' + icon + '"></div>' + '<div>' + '<div class="displayName">' + userN + '</div>' + '<div class="login">' + user + '</div>' + '</div>' + '</div>';
					}
				}
			}
			userDlg.find( '.inforDialogContent' ).append( html ).children( '.SCE-Meta-UserContainer' ).click( function( e ) {
				userDlg.inforClose( {
					prePostProcess : false
				} );
				var nUser = $( this ).find( '.login' ).html( );
				var nUserName = $( this ).find( '.displayName' ).html( );
				convDlg.inforOpen( {
					prePostProcess : true,
					afterData : {
						convID : '-1',
						newUser : nUser,
						newUserName : nUserName
					}
				} );
			} );
		};
		getActiveUsers( callback );
		userDlg.find( '#userSearch' ).focus( );

		return true;
	};
	userDlg.inforHandleKeyPress = function( e ) {
		if ( e.which == KEYMAP[ 'escape' ] ) {
			userDlg.inforClose( {
				prePostProcess : true
			} );
			e.preventDefault( );
			return false;
		}

		var selected = userDlg.find( '.SCE-Meta-UserContainer.selected' );

		if ( selected.length > 0 ) {
			switch ( e.which ) {
				case KEYMAP[ 'left' ] :
				case KEYMAP[ 'up' ] :
				case KEYMAP[ 'KEY4' ] :
				case KEYMAP[ 'NUM4' ] : {
					// move focus UP
					var prev = selected.prev( );
					if ( prev.length > 0 && prev.hasClass( 'SCE-Meta-UserContainer' ) ) {
						selected.removeClass( 'selected' );
						prev.addClass( 'selected' );
					}
					e.preventDefault( );
					return false;
					break;
				}
				case KEYMAP[ 'tab' ] :
				case KEYMAP[ 'right' ] :
				case KEYMAP[ 'down' ] :
				case KEYMAP[ 'KEY6' ] :
				case KEYMAP[ 'NUM6' ] : {
					// move focus down
					var next = selected.next( );
					if ( next.length > 0 && next.hasClass( 'SCE-Meta-UserContainer' ) ) {
						selected.removeClass( 'selected' );
						next.addClass( 'selected' );
					}
					e.preventDefault( );
					return false;
					break;
				}
				case KEYMAP[ 'enter' ] : {
					var sender = selected.find( '.login' ).html( );
					var senderName = selected.find( '.displayName' ).html( );
					userDlg.inforClose( {
						prePostProcess : false
					} );
					convDlg.inforOpen( {
						prePostProcess : true,
						afterData : {
							convID : '-1',
							newUser : sender,
							newUserName : senderName
						}
					} );
					e.preventDefault( );
					return false;
					break;
				}
			}
		} else {
			switch ( e.which ) {
				case KEYMAP[ 'left' ] :
				case KEYMAP[ 'up' ] :
				case KEYMAP[ 'KEY4' ] :
				case KEYMAP[ 'NUM4' ] :
				case KEYMAP[ 'tab' ] :
				case KEYMAP[ 'right' ] :
				case KEYMAP[ 'down' ] :
				case KEYMAP[ 'KEY6' ] :
				case KEYMAP[ 'NUM6' ] :
				case KEYMAP[ 'enter' ] : {
					userDlg.find( '.inforDialogContent' ).children( ).first( ).addClass( 'selected' );
					e.preventDefault( );
					return false;
					break;
				}
			}
		}
	};

	userDlg.find( '#userSearch' ).inforSearchField( {
		click : function( event ) {
		},
		cancel : function( event ) {
			applyUserSearchFilter( '' );
		}
	} ).keyup( function( event ) {
		// let movement keys bubble up to the dialog
		// so the user can select rows.
		applyUserSearchFilter( userDlg.find( '#userSearch' ).val( ) );
		event.preventDefault( );
		return false;
	} );
}

function applyUserSearchFilter( filter ) {
	filter = filter.toLowerCase( ).trim( );
	var val = null;
	userDlg.find( '.inforDialogContent' ).children( '.SCE-Meta-UserContainer' ).each( function( ) {
		var self = $( this );
		val = self.find( '.login' ).html( ).toLowerCase( ).trim( );

		if ( val.indexOf( filter ) != -1 ) {
			self.show( );
		} else {
			val = self.find( '.displayName' ).html( ).toLowerCase( ).trim( );
			if ( val.indexOf( filter ) != -1 ) {
				self.show( );
			} else {
				self.hide( );
			}
		}
	} );
}

function resizeDialogs( ) {
	/*
	 * screens and layouts are designed for small RF guns at 240x320 in size. If we get bigger than that, scale up based on how much bigger in percent from 240x320
	 */
	if ( appConfig.forcedScaleX && appConfig.forcedScaleY ) {
		if ( appConfig.forcedScaleX == "1" && appConfig.forcedScaleY == "1" ) {
			return;
		} else {
			var scaleX = appConfig.forcedScaleX;
			var scaleY = appConfig.forcedScaleY;
			if ( isDebugOn( "SCREENBUILD" ) )
				console.debug( screenDebug( 'SCREENBUILD', '', 'SCREEN SIZE', scaleX + ' x ' + scaleY ) );
			$( 'body' ).css( {
				'-webkit-transform' : 'scale(' + scaleX + ',' + scaleY + ')',
				'-webkit-transform-origin' : '0 0',
				'-moz-transform' : 'scale(' + scaleX + ',' + scaleY + ')',
				'-moz-transform-origin' : '0 0',
				'-ms-transform' : 'scale(' + scaleX + ',' + scaleY + ')',
				'-ms-transform-origin' : '0 0',
				'-o-transform' : 'scale(' + scaleX + ',' + scaleY + ')',
				'-o-transform-origin' : '0 0',
				'transform' : 'scale(' + scaleX + ',' + scaleY + ')'
			} );
		}
	} else {
		var scaleX = $( window ).width( );
		var scaleY = $( window ).height( );
		scaleX = window.innerWidth;
		scaleY = window.innerHeight;

		scaleX = scaleX > appConfig.maxWidth ? roundNumber( scaleX / appConfig.maxWidth, 2 ) : 1;
		scaleY = scaleY > appConfig.maxHeight ? roundNumber( scaleY / appConfig.maxHeight, 2 ) : 1;

		// appConfig.forcedScaleX = scaleX;
		// appConfig.forcedScaleY = scaleY;

		if ( isDebugOn( "SCREENBUILD" ) )
			console.debug( screenDebug( 'SCREENBUILD', '', 'SCREEN SIZE', scaleX + ' x ' + scaleY ) );
		$( 'body' ).css( {
			'-webkit-transform' : 'scale(' + scaleX + ',' + scaleY + ')',
			'-webkit-transform-origin' : '0 0',
			'-moz-transform' : 'scale(' + scaleX + ',' + scaleY + ')',
			'-moz-transform-origin' : '0 0',
			'-ms-transform' : 'scale(' + scaleX + ',' + scaleY + ')',
			'-ms-transform-origin' : '0 0',
			'-o-transform' : 'scale(' + scaleX + ',' + scaleY + ')',
			'-o-transform-origin' : '0 0',
			'transform' : 'scale(' + scaleX + ',' + scaleY + ')'
		} );
	}
}

function calcNewDimensions( ) {
	var wdt = $( window ).width( );
	var hgt = $( window ).height( );
	lastWidth = wdt;
	lastHeight = hgt;
	lastOrientation = haveOrientationSupport ? window.orientation : null;

	appConfig.columnWidth = wdt >= 1280 ? 480 : 240;
	appConfig.maxHeight = 320;
	appConfig.columns = wdt > hgt ? 2 : 1;
	appConfig.maxWidth = appConfig.columns * appConfig.columnWidth;
	appConfig.rows = Math.floor( ( appConfig.maxHeight - appConfig.footerRowHeight - appConfig.headerHeight ) / appConfig.rowHeight );

	if ( isDebugOn( "SCREENBUILD" ) )
		console.debug( screenDebug( 'SCREENBUILD', '', 'APPCONFIG SCREEN SIZE', appConfig.maxWidth + ' x ' + appConfig.maxHeight ) );

	$( 'body' ).height( appConfig.maxHeight );

	if ( footerDIV )
		footerDIV.width( appConfig.maxWidth );
	else
		$( '#footerDIV' ).width( appConfig.maxWidth );

	if ( headerDIV )
		headerDIV.width( appConfig.maxWidth );
	else
		$( '#headerDIV' ).width( appConfig.maxWidth );

	$( '#specialKeysTablet' ).width( appConfig.maxWidth );

	if ( loginDIV )
		loginDIV.width( appConfig.maxWidth ).height( appConfig.maxHeight );
	else
		$( '#layoutDIV' ).width( appConfig.maxWidth ).height( appConfig.maxHeight * 0.90 );

	if ( layoutDIV )
		layoutDIV.width( appConfig.maxWidth ).height( appConfig.maxHeight * 0.90 );
	else
		$( '#layoutDIV' ).width( appConfig.maxWidth ).height( appConfig.maxHeight * 0.90 );

	if ( !selectorDIV ) {
		selectorDIV = $( '#selectorDIV' );
	}

	selectorDIV.width( appConfig.maxWidth ).height( appConfig.maxHeight * 0.80 );

	if ( appConfig.columns === 1 ) {
		selectorDIV.find( '#selectorContent' ).width( appConfig.maxWidth * 0.95 );
		selectorDIV.find( '#selectorDetail' ).width( appConfig.maxWidth * 0.95 ).css( {
			left : "3%"
		} );
	} else {
		selectorDIV.find( '#selectorContent' ).width( appConfig.maxWidth / 2 );
		selectorDIV.find( '#selectorDetail' ).width( ( appConfig.maxWidth / 2 ) - 10 ).css( {
			left : "51%"
		} );
	}
}

/*
 * Waits for the WebSocket to make a connection before processing the login request
 */
function startTheController( ) {

	if ( ! ( "WebSocket" in window ) ) {
		$( "body" ).html( SCElocalize( 'WSNotSupported' ) );
		return;
	}

	++connectionCount;
	if ( !ws )
		ws = new InforMetaWS( appConfig.getServerURL( ) );
	else
		ws.init( false );
}

/*
 * We lost the socket and connected to a new one. Must re authenticate with the new socket server
 */
function reconnect( ) {
	ws.reconnect = false;
	if ( currentScreen ) {
		if ( currentScreen.screenName == 'L1' ) {
			// never logged in.
			loginDIV.show( );
			if ( currentScreen )
				currentScreen.enableScreen( );
		} else {
			if ( !appConfig.st ) {
				// there is no token for some reason. no point in attempting a reconnect and reauthorization
				// exit and force the user to login again.
				exitScreen( );
				return;
			} else {
				var sendString = 'EXEC ' + appConfig.reconnectProc + '  ' + buildXMITHeader( appConfig.reconnectProc, 'OT08' );
				sendString = sendString + addEncodedDataParameters( 'en', '', 'WEBRF', tenantName, appConfig.st );
				// just send it
				ws.sendMessageNoPing( appConfig.reconnectProc, sendString, function( data ) {
					if ( isDebugOn( 'SOCKET' ) )
						console.debug( screenDebug( 'SOCKET', currentScreen, 'reconnect response received', data ) );
					data = parseReturnString( data );
					if ( !data || data.getCode( ) == 9 ) {
						if ( isDebugOn( 'SOCKET' ) )
							console.debug( screenDebug( 'SOCKET', currentScreen, 'reconnect failed, server could not re authorize', data.miscmsg ) );
						displayPageError( data.getMessage( ), function( ) {
							exitScreen( );
						} );
					} else {
						appConfig.st = data.getValue( 0 );
						if ( typeof ws.afterReconnect != 'undefined' ) {
							// user was trying to send something.
							currentScreen.disableScreen( true );
							ws.afterReconnect( );
							delete ws.afterReconnect;
						} else {
							currentScreen.enableScreen( );
						}
					}
				}, null, false );
			}
		}
	} else {
		exitScreen( );
	}
}

/*
 * localizePages can get called TWICE so make sure any logic here can overwrite existing text and not APPEND to it.
 */
function localizePages( ) {
	// login page
	var dialog = $( '#login' );
	dialog.find( '#header' ).html( SCElocalize( 'Login_Title' ) );
	dialog.find( '#serverLabel' ).html( SCElocalize( 'Login_Server' ) );
	dialog.find( '#portLabel' ).html( SCElocalize( 'Login_WSPort' ) );
	dialog.find( '#userLabel' ).html( SCElocalize( 'Login_User' ) );
	dialog.find( '#passwordLabel' ).html( SCElocalize( 'Login_Password' ) );

	// global
	$( '#F1HelpButton' ).html( SCElocalize( 'ScreenAction' ) );

	// find user dialog
	dialog = $( '#userLookupDialog' );
	dialog.find( '#captionID' ).html( SCElocalize( 'UserDialog_Title' ) );
	dialog.find( '#userSearch' ).attr( 'placeholder', SCElocalize( 'UserDialog_UserSearch' ) );

	// System Menu Popup
	var dialog = $( '#menuDialog' );
	dialog.find( '#captionID' ).html( SCElocalize( 'SystemMenu' ) );
	dialog.find( '#homeButton' ).find( 'label' ).html( SCElocalize( 'SystemMenu_Home' ) );
	dialog.find( '#imageUploadButton' ).find( 'label' ).html( SCElocalize( 'SystemMenu_ImageUpload' ) );

	// Messages Dialog
	dialog = $( '#messagesDialog' );
	dialog.find( '#captionID' ).html( SCElocalize( 'MsgDialog_Title' ) );

	// Image Upload Dialog
	dialog = $( '#uploadDIV' );
	dialog.find( '#captionID' ).html( SCElocalize( 'ImageUpload_Title' ) );
	dialog.find( '#storerkeyLabel' ).html( SCElocalize( 'ImageUpload_Storer' ) );
	dialog.find( '#itemkeyLabel' ).html( SCElocalize( 'ImageUpload_Item' ) );
	dialog.find( '#uomLabel' ).html( SCElocalize( 'ImageUpload_Uom' ) );
	dialog.find( '#upload' ).html( SCElocalize( 'ImageUpload_Upload' ) );

	// Conversation Dialog
	dialog = $( '#conversationDialog' );
	dialog.find( '#daMsgLabel' ).html( SCElocalize( 'ConvDlg_ReplyButton' ) );
	dialog.find( '#captionID' ).html( SCElocalize( 'ConvDlg_Title' ) );

	// warehouse selection dialog
	dialog = $( '#warehouseSelectDialog' );
	dialog.find( '#captionID' ).html( SCElocalize( 'WarehouseSelection' ) );

	dialog = $( '#aboutDialog' );
	dialog.find( '#captionID' ).html( SCElocalize( 'AboutDialog_Title' ) );

	dialog = $( '#acceptDialog' );
	dialog.find( '#dialogContent' ).html( SCElocalize( 'AcceptDialogInput' ) );
	dialog.find( '#captionID' ).html( SCElocalize( 'Confirmation' ) );
	dialog.find( '#acceptButton' ).html( SCElocalize( 'Accept' ) );
	dialog.find( '#cancelButton' ).html( SCElocalize( 'Cancel' ) );

	$( '#selectorDIV' ).find( '#recnumLabel' ).html( SCElocalize( 'SelectorRecord' ) );
	$( '#selectorDIV' ).find( '#rectotLabel' ).html( SCElocalize( 'SelectorOf' ) );
};

function handleConfigData( data ) {

	if ( !data ) {
		displayPageError( SCElocalize( "Error_MissingConfigData" ), function( ) {
			exitScreen( );
		} );
		return;
	}

	if ( typeof data.connections === 'object' && data.connections.length > 0 ) {
		appConfig.connections = data.connections;
	}

	loadConfigSettings( data );

	handleQueryParameters( );
}

function setConfigStringValue( value, key, def ) {
	if ( !value )
		appConfig[ key ] = def;
	else
		appConfig[ key ] = value;
}

function setConfigIntegerValue( value, key, def ) {
	if ( isNaN( value ) )
		appConfig[ key ] = def;
	else
		appConfig[ key ] = parseInt( value );
}

function setConfigBooleanValue( value, key, def ) {
	appConfig[ key ] = ( value == "1" || value == "true" || value == 'TRUE' ) ? true : def;
}

function setConfigArrayValue( value, key, def ) {
	appConfig[ key ] = ( value && value.length && typeof value == 'object' ) ? value : def;
}

function setConfigObjectValue( value, key, def ) {
	appConfig[ key ] = ( value && typeof value == 'object' ) ? value : def;
}

function handleQueryParameters( ) {
	var host = getQueryParameter( 'host', null );
	var port = getQueryParameter( 'port', '80' );
	var protocol = getQueryParameter( 'socket', 'ws' );
	var path = getQueryParameter( 'path', null );
	if ( host && path ) {
		var t = {
			server : host,
			port : port,
			protocol : protocol,
			path : path
		};

		var t2 = appConfig.connections[ 0 ];
		appConfig.connections.push( t2 );
		appConfig.connections[ 0 ] = t;
	}

	tenantName = getQueryParameter( 'tenant', tenantName );
	usersLocale = getQueryParameter( 'lang', usersLocale );
	deviceCode = getQueryParameter( 'device', deviceCode );

	appConfig.NFS = getQueryParameter( 'NFS', 'true' ) == 'true';
	appConfig.debug = getQueryParameter( 'DBG', appConfig.debug );
	appConfig.remoteDebug = getQueryParameter( 'RDBG', appConfig.remoteDebug );

	if ( queryParameterExists( 'RF' ) )
		appConfig.isTablet = getQueryParameter( 'RF', 1 ) != 1;
	else
		appConfig.isTablet = true;

	appConfig.RFHeight = getQueryParameter( 'HGT', appConfig.RFHeight );
	appConfig.RFWidth = getQueryParameter( 'WDT', appConfig.RFWidth );
	appConfig.forcedScaleX = getQueryParameter( 'SCALEX', appConfig.forcedScaleX );
	appConfig.forcedScaleY = getQueryParameter( 'SCALEY', appConfig.forcedScaleY );
	if ( appConfig.forcedScaleX && !appConfig.forcedScaleY ) {
		appConfig.forcedScaleY = appConfig.forcedScaleX;
	}

	if ( !appConfig.debug || !console ) {
		console = {
			info : function( ) {
			},
			debug : function( ) {
			},
			error : function( ) {
			},
			log : function( ) {
			},
			time : function( ) {
			}
		};
	} else if ( appConfig.debug ) {
		var items = appConfig.debug.split( ',' );
		appConfig.debug = {};
		for ( var idx = 0; idx < items.length; ++idx )
			appConfig.debug[ items[ idx ] ] = 1;

		if ( appConfig.remoteDebug === "1" ) {
			console.q = new Queue( );
			console.debug = function( ) {
				try {
					remoteDebug( arguments );
				} catch ( e ) {
					console.error( e );
				}
			};

			remoteDebugEngine( ); // starts the engine to thread debug messages
		} else {
			if ( !appConfig.debug.DEBUG )
				console.debug = function( ) {
				};

			if ( !appConfig.debug.INFO )
				console.info = function( ) {
				};

			if ( !appConfig.debug.ERROR )
				console.error = function( ) {
				};
		}
	}
}

function closeDialogs( ) {
	if ( dialogOpen ) {
		try {
			$( '#errorDialog' ).parent( ).off( 'keydown' );
		} catch ( err ) {
		}
		try {
			dialogOpen.inforDialog( 'close' );
			$( '.inforOverlay' ).remove( );

			if ( currentScreen )
				currentScreen.setFirstFieldFocus( );
		} catch ( err ) {
			console.error( 'failed to close a dialog', dialogOpen, err.message, err.stack );
		}
	}
}

function displayPageError( msg, callback, doNotClearProcessFlagOnClose ) {
	vibrateDevice( 'vibrateOnInputError' );
	msg = msg.replace( /</g, "&lt;" ).replace( />/g, "&gt;" );
	$( '.inforDialog' ).remove( );
	$( '#errorDialog' ).inforMessageDialog( {
		title : SCElocalize( "MsgDlg_Alert" ),
		shortMessage : '',
		detailedMessage : msg,
		dialogType : 'Alert',
		showTitleClose : false,
		width : appConfig.popMaxWidth,
		height : 'auto',
		modal : true,
		autoFocus : true,
		draggable : false,
		closeOnEscape : false,
		open : function( ) {
			errorOpen = true;
			dialogOpen = $( this );

			// if the ....working overlay is open, need to make sure popup gets
			// displayed on top of that.
			moveThisToTheFront( dialogOpen.parent( ) );
			dialogOpen.inforHandleKeyPress = function( event ) {
				try {
					if ( isDebugOn( 'KEYEVENT' ) )
						console.debug( simpleDebug( 'KEYEVENT', 'starting display displayPageError.inforHandleKeyPress', '' ) );
					closeDialogs( );
				} catch ( e ) {

				} finally {
					if ( isDebugOn( 'KEYEVENT' ) )
						console.debug( simpleDebug( 'KEYEVENT', 'leaving display displayPageError.inforHandleKeyPress' ) );
				}
			};
		},
		close : function( event, ui ) {
			try {
				if ( isDebugOn( 'KEYEVENT' ) )
					console.debug( simpleDebug( 'KEYEVENT', 'starting display displayPageError.close' ) );
				errorOpen = false;
				dialogOpen = null;
				if ( callback )
					callback( );
				else if ( currentScreen )
					currentScreen.setFirstFieldFocus( );
			} finally {
				if ( isDebugOn( 'KEYEVENT' ) )
					console.debug( simpleDebug( 'KEYEVENT', 'leaving display displayPageError.close' ) );
				if ( !doNotClearProcessFlagOnClose ) {
					controller.clearInProcess( );
				}
			}
		},
		buttons : [
			{
				text : SCElocalize( "Ok" ),
				click : function( ) {
					closeDialogs( );
				}
			}
		]
	} );
}

function initAcceptDialog( ) {
	acceptDialog = $( '#acceptDialog' );
	acceptDialog.inforOpen = inforOpenDialog;
	acceptDialog.inforClose = inforCloseDialog;
	acceptDialog.inforHandleKeyPress = function( event ) {
		if ( event.which == 13 || event.which == 27 ) { // enter or esc
			try {
				acceptDialog.inforClose( );
				event.preventDefault( );
				if ( event.which == 13 ) {
					controller.nextScreen( InforMetaScreen.EXIT_NEXT, 1 );
				}
			} catch ( err ) {
			}
			return false;
		}
		return true;
	};
	acceptDialog.find( '#acceptButton' ).on( 'click', function( evt ) {
		acceptDialog.inforClose( );
		controller.nextScreen( InforMetaScreen.EXIT_NEXT, 1 );
	} );
	acceptDialog.find( '#cancelButton' ).on( 'click', function( evt ) {
		acceptDialog.inforClose( );
	} );
}

function setMessageSecurity( ) {

	if ( typeof userConfig.msgsec != 'undefined' ) {
		if ( userConfig.msgsec < 0 ) {
			// turn it all off.
			$( '#messageAlert' ).hide( );
		} else {
			// user is allowed some stuff.
			$( '#messageAlert' ).click( function( ) {
				msgDlg.inforOpen( {
					prePostProcess : true
				} );
			} );

			if ( userConfig.msgsec == 0 ) {
				msgDlg.find( '#newReceipent' ).hide( );
				convDlg.find( '#daMsg' ).hide( );
				convDlg.find( '#daMsgLabel' ).hide( );
			} else if ( userConfig.msgsec == 1 ) {
				msgDlg.find( '#newReceipent' ).hide( );
			}
		}
	}
}

function checkNewMessages( ) {
	if ( userConfig.msgsec < 0 )
		return;

	var data = 'EXEC ' + newmsgproc + ' ' + buildXMITHeader( newmsgproc, newmsgproc ) + addEncodedDataParameters( userID );
	ws.sendMessage( newmsgproc, data, null, null, false );
}

function youveGotMail( ) {
	if ( userConfig.msgsec < 0 )
		return; // user not allowed msgs

	if ( InforUserMsg.incomingMsg.length( ) > 0 ) {
		var msg = null;
		while ( InforUserMsg.incomingMsg.length( ) > 0 ) {
			msg = InforUserMsg.incomingMsg.dequeue( );
			InforUserMsg.addMessageToConversation( msg.convID, msg, msg.group, false );
		}

		if ( dialogOpen ) {
			var id = dialogOpen.attr( 'id' );
			if ( id == 'messagesDialog' ) {
				buildMessagesDialog( dialogOpen );
			} else if ( id == 'conversationDialog' ) {
				buildConvDialog( dialogOpen );
				var content = convDlg.find( '.inforDialogContent' );
				scrollToNav( content, content.find( '.SCE-Meta-MsgText' ).last( ) );
			}
		}
	}
	setNewMailStatus( );
}

function setNewMailStatus( ) {
	if ( userConfig.msgsec < 0 )
		return;
	var msgs = InforUserMsg.messages;
	var id = null;
	var allRead = true;

	for ( id in msgs ) {
		allRead = InforUserMsg.isConversationRead( id, userID );
		if ( !allRead )
			break;
	}

	if ( allRead ) {
		$( '#messageAlert' ).removeClass( 'email' ).addClass( 'translate' );
	} else {
		$( '#messageAlert' ).addClass( 'email' ).removeClass( 'translate' );
	}
}

function buildMessagesDialog( ) {
	if ( userConfig.msgsec < 0 )
		return;

	msgDlg.find( '.inforDialogContent' ).html( '' ).height( msgDlg.height( ) * 0.7 );

	var html = '';
	var msg = null;

	var tempMessages = [ ];
	var id = null;
	for ( id in InforUserMsg.messages ) {
		tempMessages.push( {
			convID : id,
			t : InforUserMsg.newestMessageTime( id )
		} );
	}

	sortArrayByKey( tempMessages, [
		{
			key : 't',
			order : 'DESC'
		}
	] );

	for ( var c in tempMessages ) {
		msg = InforUserMsg.getConversation( tempMessages[ c ].convID ); // last message sent by this sender
		msg = msg[ msg.length - 1 ];
		html = html + msg.createConversationOverview( userID );
	}
	msgDlg.find( '.inforDialogContent' ).append( html ).find( '.SCE-Meta-ConversationContainer' ).click( function( e ) {
		var convID = $( e.target ).closest( '.SCE-Meta-ConversationContainer' ).find( '.convid' ).html( );
		msgDlg.inforClose( {
			prePostProcess : false
		} );
		convDlg.inforOpen( {
			prePostProcess : true,
			afterData : convID
		} );
	} );
}

function buildConvDialog( dlg ) {
	if ( userConfig.msgsec < 0 )
		return;

	var convID = dlg.find( '#hiddenConvID' ).val( );
	var content = dlg.find( '.inforDialogContent' );
	content.html( '' ).height( appConfig.maxHeight - 120 );
	var html = InforUserMsg.createMessageEntry( convID );
	content.append( html );
}

function getActiveUsers( callback ) {
	if ( !callback )
		return;

	var data = 'EXEC ' + activeuserproc + '  ' + buildXMITHeader( activeuserproc, activeuserproc );
	ws.sendMessage( activeuserproc, data, callback, null, false );
}

function navigateHomeMenu( firstMenuOnly ) {
	if ( dialogOpen && menuDIV && menuDIV.is( dialogOpen ) ) {
		menuDIV.inforClose( false );
	}

	// if we are already at the top menu, do nothing.
	if ( currentScreen && currentScreen.screenName === controller.topMenu )
		return;

	if ( firstMenuOnly && currentScreen && currentScreen.MENU )
		return;

	// pull screens off the stack until we get to the top level menu
	var screen = null;
	while ( controller && controller.topMenu && controller.getScreenStackSize( ) > 1 ) {
		screen = controller.popScreenStack( );
		controller.popStateStack( ); // keep state stack in sync with screen stack.
		if ( firstMenuOnly && screen.MENU )
			break;

		if ( screen.screenName === controller.topMenu )
			break;
	}
	if ( screen ) {
		// sending resume=true. This is a menu though and the only effect
		// 'resuming' has is to NOT put the current screen on the screen stack,
		// which we do not want here.
		controller.initScreen( screen.screenName, true, -1 );
	}
}

function openImageCapture( ) {
	if ( appConfig.imageHTTP ) {
		displayPageError( SCElocalize( "Error_Image_Capture_Disabled" ), function( ) {
			currentScreen.enableScreen( );
		}, false );
	} else {
		var instruction = new InforMetaExpression( );
		instruction.func = 'SENDIF';
		instruction.screen = 'IMG01';
		instruction.full = 'SENDIF(IMG01,1,(TRUE))';
		currentScreen.setResume( false );
		controller.changeScreen( instruction, false );
	}
}

function generateID( ) {
	return ( '00000' + Math.floor( Math.random( ) * 999999 ) ).slice( -6 );
}

/*
 * prevents the browser from gaining focus while tabbing around.
 */
function nextField( shifted, afterHandleFGFUNC ) {

	var inputs = null;
	var skipOnBlank = currentScreen ? currentScreen.SKIPONBLANK : 0;

	if ( currentScreen && currentScreen.screenName != 'L1' ) {
		if ( currentScreen.SEARCHRESULT ) {
			inputs = layoutDIV.find( ':input:not(button)' );
		} else {
			inputs = layoutDIV.find( ':input:not([readonly]):not(button)' );
		}
	} else {
		inputs = loginDIV.find( ':input:not([readonly]):not(button)' );
	}

	var focused = $( ':focus' );
	if ( focused.length == 0 && currentScreen ) {
		currentScreen.setFirstFieldFocus( );
		focused = $( ':focus' );
	}

	var widget = null;
	if ( focused.length > 0 ) {
		widget = InforMetaWidget.getWidgetFromJQueryObject( focused );
	}

	if ( widget && widget.isRequired( ) && widget.isBlank( ) && widget.WTYPE != WIDGET_DATE && widget.WTYPE != WIDGET_CHOICE ) {
		// it's blank and required so don't let it go by
		return 0;
	}

	if ( skipOnBlank && widget && widget.isBlank( ) ) {
		return 2;
	}

	var cIndex = $( inputs ).index( $( focused )[ 0 ] );

	var nextInput = null;
	if ( cIndex > 0 && shifted ) {
		nextInput = $( inputs ).get( cIndex - 1 );
	} else if ( !shifted && cIndex < $( inputs ).length ) {
		nextInput = $( inputs ).get( cIndex + 1 );
	}
	var nextWidget = InforMetaWidget.getWidgetFromJQueryObject( $( nextInput ) );

	if ( currentScreen && currentScreen.currentFieldGroup && ( !nextWidget || ( nextWidget && nextWidget.FGNAME != currentScreen.currentFieldGroup ) ) ) {
		if ( nextWidget ) {
			if ( isDebugOn( 'FGS' ) )
				console.debug( widgetDebug( 'FGS', nextWidget, 'field group is changing, trigger PROC call', 'current:[' + currentScreen.currentFieldGroup + ']' ) );
		} else {
			if ( isDebugOn( 'FGS' ) )
				console.debug( simpleDebug( 'FGS', 'no next widget, close out the current field group', 'current:[' + currentScreen.currentFieldGroup + ']' ) );
		}
		currentScreen.handleFGChange( nextWidget, afterHandleFGFUNC );
	} else {
		if ( nextWidget && nextWidget.hasFieldGroup( ) ) {
			// moving from no field group into a field group.
			currentScreen.setCurrentFieldGroup( nextWidget.FGNAME );
		}
		// if we have a next input, go to it. or go back
		if ( $( nextInput ) && $( nextInput )[ 0 ] ) {
			$( nextInput ).focus( );
		} else {
			return 1;
		}
	}

	return 0;
}

/*
 * triggered from button press on toolbar
 */
function nextScreen( ) {
	if ( controller.inProcess( ) || ws.sending ) {
		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( screenDebug( "", currentScreen, "nextScreen button pressed", "we're processing stuff. ignore press" ) );
		return false;
	}

	if ( controller.CSN != 'L1' ) {
		if ( currentScreen.SELECTOR ) {
			var done = currentScreen.determineNextStep( 'ONENTER' );
			if ( done ) {
				if ( currentScreen.DELETEONENTER ) {
					var content = selectorDIV.find( '#selectorContent' );
					var focusCSS = appConfig.columns === 1 ? 'focusCol1' : 'focusCol2';
					var theRow = content.find( '.SCE-Meta-LayoutRow.' + focusCSS );

					if ( theRow.length == 0 ) {
						theRow = content.find( '.SCE-Meta-LayoutRow.selected' );
					}
					if ( theRow.length != 0 ) {
						var idx = parseInt( theRow.attr( "rname" ) );
						theRow.remove( );
						if ( typeof idx === 'number' ) {
							currentScreen.selectorData.splice( idx, 1 );
						}
					}
				}

				// weird scenario. Using a SELECTOR screen in place of a SearchResult. We'll end up using SET
				// commands to pass data instead of the normal method with the SEARCHRESULT flag.
				// Why is this weird?
				// We'll end up with two different copies of the original screen that invoked the lookup.
				// We'll do our thing in the 2nd copy but the 1st copy will no longer know it's the one that invoked
				// the lookup. 1st screen will get control at some point again and assume it's resuming normal processing
				// and not resuming lookup processing.
				if ( controller.LKCALLER && done.screen == controller.LKCALLER.screen ) {
					if ( isDebugOn( "SCREENFLOW" ) )
						console.debug( screenDebug( 'SCREENFLOW', currentScreen, 'special lookup using selector go back to caller scenario.', '' ) );
					currentScreen.saveData( done );
					currentScreen.closeSelectorDetail( );
					controller.prevScreen( InforMetaScreen.EXIT_PREV );
					return false;
				} else {
					if ( currentScreen.SELECTOR && this.EXITONENTER )
						currentScreen.setExit( true, 'exitonenter' );

					currentScreen.closeSelectorDetail( );
					controller.changeScreen( done, false );
					return false;
				}
			}

			done = currentScreen.determineNextStep( 'ERROR', 1 );
			if ( done ) {
				if ( done.func == 'ERRORYESNO' ) {
					currentScreen.displayYesNoDialog( done );
				} else if ( done.func == 'ERROR' ) {
					if ( currentScreen.EXITONERROR )
						currentScreen.setExit( true, 'exitonerror' );
					controller.changeScreen( done, false );
				} else if ( done.func == 'ERRORWARNING' ) {
					displayPageError( this.translate( done.msg ), function( ) {
						controller.clearInProcess( );
					} );
				}
				currentScreen.closeSelectorDetail( );
				return false;
			}
		} else if ( !currentScreen.SEARCHRESULT ) {
			var focused = $( ':focus' );
			var cwidget = InforMetaWidget.getWidgetFromJQueryObject( focused );
			var hval = focused.val( );

			if ( currentScreen.VALIDATEINPUT && currentScreen.lastField && focused.attr( 'id' ) != currentScreen.lastField.ID ) {
				// this is not the last field in the list for this VALIDATEINPUT screen.
				// bump up the displayed rows to the next editable field and redisplay
				currentScreen.validateRow = currentScreen.findNextValidateField( );
				var maxRow = ( currentScreen.calculateMaxRowsPerPage( ) * this.currPage ) - 1; // 0 based rows
				if ( currentScreen.validateRow <= maxRow ) {
					currentScreen.buildScreen( true, false, false, true );
					return;
				}
			}

			// handleBlur won't trigger when we're on the last field in the form since we don't
			// focus out of the last field. So run the blur validation logic here.
			if ( cwidget && cwidget.WTYPE === WIDGET_DATE && hval.length > 0 ) {
				// dates can get out of sync as they won't have a valid internal
				// date until the entire date is entered.
				cwidget.setValue( hval );
				if ( cwidget.getRawValue( ).length <= 0 ) {
					focused.val( '' );
					cwidget.setValue( '' );
					displayPageError( SCElocalize( "Error_InvalidDateInField", cwidget.NAME ), function( ) {
						focused.focus( );
					} );
					return;
				}
			} else if ( cwidget && !cwidget.validateContents( ) ) {
				focused.val( '' );
				cwidget.setValue( '' );
				displayPageError( SCElocalize( "Error_InvalidDataInField", cwidget.NAME ), function( ) {
					focused.focus( );
				} );
				return;
			}

			if ( currentScreen ) {
				currentScreen.nextScreenCheck( 1 );
			} else {
				acceptDialog.inforOpen( );
			}

		} else {
			var temp = layoutDIV.find( ':focus' );
			var widget = InforMetaWidget.getWidgetFromJQueryObject( temp );
			if ( widget && controller.LKCALLER ) {
				var caller = controller.LKCALLER;
				var theName = '';
				if ( widget.NAME.indexOf( 'Desc' ) !== -1 )
					theName = 'Value' + widget.NAME.substring( 4 );
				else
					theName = widget.NAME;

				var value = currentScreen.getWidgetByName( theName, 'DISPLAY' );
				if ( value ) {
					var debugWidget = controller.screens[ caller.screen ].getWidgetByName( caller.field, caller.vector );
					if ( isDebugOn( "LOADDATA" ) )
						console.debug( widgetDebug( 'LOADDATA', debugWidget, 'LOOKUP RETURN VALUE', 'new value' + value.getRawValue( ) ) );
					debugWidget.setValue( value.getRawValue( ) );
					delete controller.LKCALLER;
				}
			}
			controller.prevScreen( InforMetaScreen.EXIT_PREV );
		}
	}
}

/*
 * triggered from button press on toolbar
 */
function prevScreen( ) {
	if ( controller.inProcess( ) || ws.sending ) {
		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( screenDebug( "SCREENFLOW", currentScreen, "prevScreen button pressed", "we're processing stuff. ignore press" ) );
		return false;
	}

	if ( controller )
		controller.prevScreen( InforMetaScreen.EXIT_CANCEL );
}

/*
 * creates string of this information ptcid userid taskID databasename appflag recordtype server
 */
function buildXMITHeader( PROC, appFlag ) {
	if ( typeof appFlag === 'undefined' )
		appFlag = PROC;
	if ( appFlag.startsWith( appConfig.procPrefix ) ) {
		appFlag = appFlag.substring( appConfig.procPrefix.length );
	}

	var aLength = appFlag.length;
	var appflag = "";
	var rectype = "01";
	if ( aLength >= 4 ) {
		appflag = appFlag.substring( 0, aLength - 2 );
		rectype = appFlag.substring( aLength - 2 );
	} else {
		appflag = appFlag;
	}

	var cConn = ws.currentConnection( );
	cConn = cConn.split( '/' ); // http://server:port/path so server value should be index 2
	var xmit = addEncodedDataParameters( '1', userID, generateID( ), usersWarehouse, tenantName, appflag, rectype, cConn[ 2 ] );
	return xmit;
}

function buildSendString( PROC, appFlag ) {
	var isLogin = false;
	if ( currentScreen.screenName == 'L1' ) {
		isLogin = true;
		PROC = appConfig.loginProc;
		appFlag = 'OT08';
		currentScreen.procName = PROC;
		currentScreen.appFlag = appFlag;
		userID = getValue( $( "#user" ).val( ) );
		userID = userID.toLowerCase( );
	} else {
		if ( typeof PROC === 'undefined' ) {
			PROC = currentScreen.procName;
		}
		if ( typeof appFlag === 'undefined' ) {
			appFlag = currentScreen.appFlag;
		}
	}

	var sendString = 'EXEC ' + PROC + '  ' + buildXMITHeader( PROC, appFlag );

	if ( isLogin ) {
		sendString = sendString + addEncodedDataParameters( usersLocale, getValue( $( "#password" ).val( ) ), 'WEBRF', tenantName );
	} else {
		// TaskMAN
		var parseIndex = 1;
		var vector = currentScreen.VECTORS[ 'SEND' ];
		var idx = 0, l = vector.length, widget = null;

		for ( idx = 0; idx < l; ++idx ) {
			widget = vector[ idx ];
			if ( currentScreen.globals.hasGlobals ) {
				//
				// There can be 1..N globals inserted between SEND fields.
				// keep moving through globals until it runs out. Then place the
				// SEND widget value.
				//
				while ( true ) {
					var gVal = currentScreen.getGlobal( 'SEND', parseIndex );
					if ( gVal != null ) {
						if ( isDebugOn( "SENDMSG" ) )
							console.debug( 'SENDMSG', 'add GLOBAL parameter', '[' + PROC + ']', '[' + gVal + ']' );
						sendString = sendString + addEncodedDataParameters( typeof gVal === 'string' ? gVal : getValue( gVal ) );
						++parseIndex;
					} else {
						break;
					}
				}
			}

			if ( widget.WTYPE === WIDGET_DATE ) {
				if ( isDebugOn( "SENDMSG" ) )
					console.debug( 'SENDMSG', 'sending a date', widget.NAME, widget.getSendValue( ) );
			}

			var sVal = getValue( widget.getSendValue( ) );
			if ( isDebugOn( "SENDMSG" ) )
				console.debug( 'SENDMSG', 'add parameter', '[' + PROC + ']', '[' + widget.NAME + ']', '[' + ( sVal.length > 100 ? sVal.substring( 0, 100 ) : sVal ) + ']' );
			sendString = sendString + addEncodedDataParameters( sVal );
			++parseIndex;
		}

		//
		// In case there are GLOBALS at the very end, we need to capture those values
		// here because we've run out of SEND widgets to loop through. Place the remaining GLOBALS
		//
		if ( currentScreen.globals.hasGlobals ) {
			while ( true ) {
				var gVal = currentScreen.getGlobal( 'SEND', parseIndex );
				if ( gVal != null ) {
					if ( isDebugOn( "SENDMSG" ) )
						console.debug( 'SENDMSG', 'add GLOBAL parameter', '[' + PROC + ']', '[' + gVal + ']' );
					sendString = sendString + addEncodedDataParameters( typeof gVal === 'string' ? gVal : getValue( gVal ) );
					++parseIndex;
				} else {
					break;
				}
			}

		}
	}

	// dont log passwords.
	if ( !isLogin && isDebugOn( "SENDMSG" ) )
		console.debug( sDebug( 'SENDMSG', '', '', '', 'buildSendString', 'PROC[' + PROC + '] appFlag[' + appFlag + '] sendString[' + sendString + ']' ) );
	return sendString;
}

function getValue( value ) {
	return value && value != 'null' ? value.trim( ) : '';
}

function exitScreen( timer ) {
	if ( timer ) {
		setTimeout( function( ) {
			exitScreen( );
		}, timer );
	} else {
		window.location.href = window.location.href;
	}
}

function sortScreenData( theData, keys ) {
	sortArrayByKey( theData ? theData : currentScreen.fieldData, keys ? keys : sortScreenDataRF );
}

function sortArrayByKey( array, sortValues ) {
	return array.sort( function( a, b ) {
		for ( var idx = 0; idx < sortValues.length; ++idx ) {
			var a1 = a[ sortValues[ idx ].key ];
			var b1 = b[ sortValues[ idx ].key ];

			// checks ignore case of strings.
			if ( typeof a1 === "string" )
				a1 = a1.toLowerCase( );
			if ( typeof b1 === "string" )
				b1 = b1.toLowerCase( );

			var moreKeys = idx < ( sortValues.length - 1 );
			// if no more keys to check OR the key being checked are not equal,
			// return the comparision.
			// if there are more keys, the for loop with come around and check
			// the next set, assuming the
			// current key checks are equal.
			if ( !moreKeys || ( moreKeys && a1 != b1 ) ) {
				if ( sortValues[ idx ].order && sortValues[ idx ].order == 'DESC' )
					return ( ( a1 > b1 ) ? -1 : ( ( a1 < b1 ) ? 1 : 0 ) );
				else
					return ( ( a1 < b1 ) ? -1 : ( ( a1 > b1 ) ? 1 : 0 ) );
			}
		}

	} );

}

function removeParans( exp ) {
	if ( exp && exp.substring( 0, 1 ) == '(' && exp.substring( exp.length - 1, exp.length ) == ')' )
		exp = exp.substring( 1, exp.length - 1 ).trim( );

	return exp;
}

/*
 * Parses up the query string in the URL and puts the key/value pairs into a map
 */
function getQueryString( win ) {
	if ( multimap )
		return;
	var qs = win.location.search;
	multimap = {};
	if ( qs.length > 1 ) {
		qs = qs.substr( 1 );
		qs.replace( /([^=&]+)=([^&]*)/g, function( match, hfname, hfvalue ) {
			var name = decode( hfname );
			var value = decode( hfvalue );
			if ( name.length > 0 ) {
				name = name.toLowerCase( );
				if ( !multimap.hasOwnProperty( name ) ) {
					multimap[ name ] = [ ];
				}
				multimap[ name ].push( value );
			}
		} );
	}
}

/*
 * using the map created in getQueryString, look for a key and return it's value. returns the default value if no key exists.
 */
function getQueryParameter( key, defValue ) {
	try {
		var tKey = key.toLowerCase( );
		if ( multimap == undefined || multimap == null ) {
			return defValue;
		}

		if ( multimap.hasOwnProperty( tKey ) && multimap[ tKey ].length > 0 ) {
			return multimap[ tKey ][ 0 ];
		}
	} catch ( e ) {
	}
	return defValue;
}

function queryParameterExists( key ) {
	var tKey = key.toLowerCase( );
	if ( multimap == undefined || multimap == null || !multimap.hasOwnProperty( tKey ) || multimap[ tKey ].length <= 0 )
		return false;
	else
		return true;
}

function vibrateDevice( caller ) {
	if ( appConfig.vibrate && appConfig[ caller ] ) {
		try {
			if ( typeof navigator.vibrate === 'function' ) {
				if ( typeof appConfig.vibratePattern === 'object' )
					navigator.vibrate( appConfig.vibratePattern );
				else
					navigator.vibrate( [
						1000
					] );
			}
		} catch ( e ) {
		}
	}
}

function SCElocalize( ) {
	var code = arguments[ 0 ];
	try {
		code = Globalize.localize( arguments[ 0 ], usersLocale.replace( /_/gi, '-' ) );
	} catch ( e ) {
		console.error( usersLocale, arguments, e );
	}
	if ( typeof code !== 'string' )
		return arguments[ 0 ];

	if ( arguments.length > 1 ) {
		for ( var idx = 1; idx < arguments.length; ++idx ) {
			code = code.replace( /%s/i, arguments[ idx ] );
		}
	}

	return code;
}

function inforCloseDialog( arg ) {
	arg = typeof arg === 'undefined' ? {
		prePostProcess : true
	} : arg;

	if ( arg.prePostProcess && this.beforeCloseDialog ) {
		var ret = this.beforeCloseDialog( arg.beforeData );
		if ( ret === false )
			return;
	}

	this.hide( );
	dialogOpen = null;

	if ( arg.prePostProcess && this.afterCloseDialog ) {
		this.afterCloseDialog( arg.afterData );
	}
}

function inforOpenDialog( arg ) {

	try {
		arg = typeof arg === 'undefined' ? {
			prePostProcess : true
		} : arg;

		var cont = true;
		if ( arg.prePostProcess && this.beforeOpenDialog ) {
			cont = this.beforeOpenDialog( arg.beforeData );
		}

		if ( !cont )
			return;

		this.show( );
		dialogOpen = this;

		if ( arg.prePostProcess && this.afterOpenDialog ) {
			this.afterOpenDialog( arg.afterData );
		}

		// if the ....working overlay is open, need to make sure popup gets
		// displayed on top of that.
		moveThisToTheFront( dialogOpen );

		// on tablets, this forces the virtual keyboard to disappear
		// when we show the popup.
		$( this ).focus( ).blur( );
	} finally {
		controller.clearInProcess( );
	}

}

function remoteDebugEngine( ) {
	try {
		if ( !console.q )
			return;

		if ( ws && ws.socket && ws.socket.readyState == 1 ) {
			var msg = console.q.dequeue( );

			if ( msg && msg.startsWith( '{' ) ) {
				ws.socket.send( msg );
			}
		}

		setTimeout( function( ) {
			remoteDebugEngine( );
		}, 50 );
	} catch ( err ) {
		console.error( 'remoteDebugEngine', err );
	}
}

function remoteDebug( msg ) {
	if ( console.q ) {
		if ( typeof msg === 'object' && msg.length === 1 && typeof msg[ 0 ] === 'string' ) {
			console.q.enqueue( msg[ 0 ] );
		} else if ( typeof msg === 'string' ) {
			console.q.enqueue( msg );
		}
	}
}

function isDebugOn( cat ) {
	if ( appConfig.debug.DEBUG && ( appConfig.debug[ cat ] || appConfig.debug[ 'ALL' ] ) )
		return true;

	return false;
}

function simpleDebug( cat, label, msg ) {
	try {
		if ( !isDebugOn( cat ) )
			return null;

		return sDebug( cat, currentScreen ? currentScreen.screenName : 'N/A', 'N/A', 'N/A', label, msg );
	} catch ( e ) {
		return e;
	}
}

function widgetDebug( cat, widgetObj, label, msg ) {
	try {
		if ( !isDebugOn( cat ) )
			return null;

		return sDebug( cat, widgetObj.PARENT.screenName, widgetObj.NAME, widgetObj.VTYPE, label, msg );
	} catch ( e ) {
		return e;
	}
}

function screenDebug( cat, screen, label, msg ) {
	try {
		if ( !isDebugOn( cat ) )
			return null;

		return sDebug( cat, screen.screenName, '', '', label, msg );
	} catch ( e ) {
		return e;
	}
}

function sDebug( cat, screen, widget, vector, label, msg ) {
	try {
		if ( !isDebugOn( cat ) )
			return null;

		var obj = {
			CAT : cat,
			SCREEN : screen,
			WIDGET : widget,
			VECTOR : vector,
			LBL : label,
			MSG : ( typeof msg === 'object' ? '[object]' : msg ),
			TS : new Date( )
		};
		return JSON.stringify( obj );
	} catch ( e ) {
		return e;
	}
}
