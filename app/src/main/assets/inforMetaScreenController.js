var inforMetaScreenControllerVersion = '11.0.1.0006';

function InforMetaScreenController( ) {
	this.screens = {};
	this.CSN = '';
	this.current = null;
	this.screenStack = new Array( );
	this.stateStack = new Array( );
	this.prevExitCode = InforMetaScreen.EXIT_NORMAL;
	this.dateSep = '/';
	this.timeSep = ':';
	this.dateFmt = 'MM/dd/yyyy';
	this.timeFmt = 'hh:mm';
	this.dateTimeFmt = 'MM/dd/yyyy hh:mm';
	this.dateFmtA = [
			'MM', 'dd', 'yyyy'
	];
	this.timeFmtA = [
			'hh', 'mm'
	];
	this.topMenu = null;
	this.inError = false;
	this.errorMessage = null;
	this.errorCode = null;
	this.inProc = false;
};

InforMetaScreenController.prototype = {

	setError : function( code, message ) {
		this.inError = true;
		this.errorMessage = message;
		this.errorCode = code;
		if ( isDebugOn( 'SCREENFLOW' ) )
			console.debug( screenDebug( 'SCREENFLOW', currentScreen, 'setError', message ) );
	},

	getError : function( ) {
		if ( this.inError )
			return this.errorMessage;

		return null;
	},

	clearError : function( ) {
		this.inError = false;
		this.errorMessage = null;
		this.errorCode = null;
		if ( isDebugOn( 'SCREENFLOW' ) )
			console.debug( simpleDebug( 'SCREENFLOW', currentScreen.screenName, 'clearError' ) );
	},

	setInProcess : function( ) {
		if ( isDebugOn( 'LOCK' ) )
			console.debug( simpleDebug( 'LOCK', currentScreen.screenName, 'set in process to true' ) );
		this.inProc = true;
	},

	lockInProcess : function( ) {
		if ( isDebugOn( 'LOCK' ) )
			console.debug( simpleDebug( 'LOCK', currentScreen.screenName, 'try to lock in process', this.inProc ) );
		var p = this.inProc;
		this.inProc = true;
		return p === false;
	},

	inProcess : function( ) {
		if ( isDebugOn( 'LOCK' ) )
			console.debug( simpleDebug( 'LOCK', currentScreen.screenName, 'checking in process value is ' + this.inProc ) );
		return this.inProc;
	},

	clearInProcess : function( ) {
		if ( isDebugOn( 'LOCK' ) )
			console.debug( simpleDebug( 'LOCK', currentScreen.screenName, 'set in process to false' ) );
		this.inProc = false;
	},

	HandleCancel : function( ) {
		// not needed. remove
	},

	handleFKeyPress : function( key ) {
		if ( !this.current )
			return false;

		var theKey = KEYMAP[ key ];

		if ( theKey ) {
			if ( theKey == appConfig.aboutKey ) {
				currentScreen.displayAboutDialog( );
				return true;
			} else if ( theKey == appConfig.msgKey ) {
				msgDlg.inforOpen( );
				return true;
			} else if ( theKey == appConfig.navHomeKey ) {
				navigateHomeMenu( );
				return true;
			} else if ( theKey == appConfig.itemKey && currentScreen.hasItemKeyData( ) ) {
				currentScreen.displayItemImageScreen( );
				return true;
			} else if ( this.specialButtonPress( theKey ) ) {
				return true;
			}
		}

		var p;
		for ( var idx = 0, l = currentScreen.parsedInstructData.length; idx < l; ++idx ) {
			p = currentScreen.parsedInstructData[ idx ];
			if ( p.func == 'OPTIONSKEY' && p.key == theKey ) {
				if ( currentScreen.EXITONKEY === true )
					currentScreen.setExit( true, 'exitonkey' );

				// coming back to this screen from a function key we don't want to do normal resuming.
				currentScreen.setResume( false );
				this.changeScreen( p, false );
				return true;
			}
		}

		return false;
	},

	inforHandleKeyPress : function( key ) {
		if ( !currentScreen || !currentScreen.MENU )
			return;

		var menuNumber = key >= KEYMAP[ 'KEY0' ] && key <= KEYMAP[ 'KEY9' ] ? key - KEYMAP[ 'KEY0' ] : key - KEYMAP[ 'NUM0' ];

		var widget = currentScreen.getMenuWidgetByNumber( menuNumber );
		if ( widget ) {
			this.buttonPress( widget.NAME, true );
		}
	},

	start : function( screenName ) {
		this.initScreen( screenName, false, -1 );
	},

	evalNumTimes : function( numTimes ) {
		if ( typeof numTimes == 'string' ) {
			if ( numTimes.indexOf( '->' ) != -1 ) {
				var pair = numTimes.split( '->' );
				var widget = currentScreen.getWidgetByName( pair[ 1 ], pair[ 0 ], false );
				if ( widget ) {
					return parseInt( widget.getRawValue( ) );
				}
			} else {
				return parseInt( numTimes );
			}
		}

		return numTimes;
	},

	initScreen : function( screenName, resumeThisScreen, numTimes ) {
		if ( isDebugOn( 'SCREENFLOW' ) )
			console.debug( 'SCREENFLOW', 'current screen', ( currentScreen ? currentScreen.screenName : 'NONE' ), 'next screen', screenName );
		var theScreen = currentScreen;
		try {
			if ( !numTimes )
				numTimes = -1;

			if ( screenName.toLowerCase( ) === 'logout' ) {
				// HACK, straight from the depths of Trident.
				// LOGOUT isn't a real screen, just a code to execute a logout.
				// issue out exitScreen and it will handle the logout procedure calls
				exitScreen( 0 );
				return;
			} else if ( screenName === 'L1' ) {
				if ( resumeThisScreen ) {
					// forces a logout and re login. will send OT09 logout transaction
					exitScreen( );
				} else {
					contentDIV.hide( );
				}
			} else if ( typeof this.loggedIn === 'undefined' ) {
				loginDIV.hide( );
				contentDIV.show( );
				headerDIV.show( );
				this.loggedIn = true;
			}

			if ( !resumeThisScreen && theScreen && theScreen.screenName != screenName ) {
				// moving forward to a new screen. Put the current screen on the stack.
				this.pushScreenStack( theScreen );
			}

			numTimes = this.evalNumTimes( numTimes );

			this.prevExitCode = theScreen ? theScreen.exitCode : InforMetaScreen.EXIT_NORMAL;
			this.CSN = screenName;
			this.current = null;
			currentScreen = null;

			if ( !this.screens.hasOwnProperty( screenName ) ) {
				// screen has never been seen before.
				if ( isDebugOn( 'DEBUG' ) )
					versionInformation( );

				this.screens[ screenName ] = new InforMetaScreen( screenName );
				this.current = this.screens[ screenName ];
				currentScreen = this.current;
				this.current.setNumTimes( numTimes );
				this.setResume( resumeThisScreen );
				if ( screenName != 'L1' ) {
					var temp = 'EXEC ' + appConfig.getScreenProc + ' ' + buildXMITHeader( appConfig.getScreenProc, appConfig.getScreenProc ) + addEncodedDataParameters( screenName, usersProfile, deviceCode, usersLocale );
					ws.sendMessage( appConfig.getScreenProc, temp, controller.loadScreenDataSuccess, screenName, false );
				} else {
					// set how we want the login screen to behave.
					currentScreen.AUTOENTER = 1;
				}
			} else {
				this.current = this.screens[ screenName ];
				currentScreen = this.current;

				if ( !resumeThisScreen ) {
					currentScreen.resetScreenInfo( true );
					currentScreen.setNumTimes( numTimes );
				}
				this.setResume( resumeThisScreen );
				this.loadScreenDataSuccess( null );
			}

			if ( !currentScreen && screenName != 'L1' ) {
				console.error( 'Failed to find a screen to use' );
				displayPageError( 'Failed to find a screen to use' );
				exitScreen( 3000 );
				return;
			} else if ( screenName == 'L1' ) {
				if ( config === null ) {
					currentScreen.disableScreen( );
				} else {
					currentScreen.enableScreen( );
				}
			}
		} finally {
		}
	},

	loadScreenDataSuccess : function( evt, screenName ) {
		// can't use 'this' here to reference the values. being passed through
		// the ajax stuff and we end up in this function where 'this' points to
		// the window and not the object.
		var scr = controller.screens[ screenName ];
		if ( typeof scr !== 'undefined' )
			scr.loadScreenDataSuccess( evt );
		else
			currentScreen.loadScreenDataSuccess( evt );
	},

	changeScreen : function( inst, resume ) {
		var toScreen = currentScreen ? currentScreen.evaluateScreenName( inst.screen ) : inst.screen;
		if ( isDebugOn( 'SCREENFLOW' ) )
			console.debug( 'SCREENFLOW', 'change screen', 'current screen:', currentScreen.screenName, 'next screen:', toScreen );
		currentScreen.saveData( inst );
		this.initScreen( toScreen, resume, inst.repeat );
	},

	callImageDisplayScreen : function( ) {
		if ( isDebugOn( 'SCREENFLOW' ) )
			console.debug( 'SCREENFLOW', 'change screen', 'current screen:', currentScreen.screenName, 'next screen:', 'IMG02A' );

		if ( appConfig.imageHTTP ) {
			if ( isDebugOn( 'SCREENFLOW' ) )
				console.debug( 'SCREENFLOW', 'change screen', 'imageHTTP is active, ajax call is next', 'AJAX' );

			currentScreen.disableScreen( );
			$.ajax( appConfig.itemIMGProcedure + '?owner=' + currentScreen.itemKeys.STORERKEY.getRawValue( ) + '&sku=' + currentScreen.itemKeys.ITEMKEY.getRawValue( ) + '&uom=' + currentScreen.itemKeys.UOM.getRawValue( ) ).done( function( imageData ) {
				console.debug( "done", imageData );
				if ( !imageData ) {
					displayPageError( SCElocalize( "Error_Image_Not_Found" ), function( ) {
						currentScreen.enableScreen( );
						controller.clearInProcess( );
					}, false );
				} else {
					var instruction = new InforMetaExpression( );
					instruction.func = 'SENDIF';
					instruction.screen = 'IMG02';
					instruction.full = 'SENDIF(IMG02,1,(TRUE))';
					var srcVector = currentScreen.itemKeys.STORERKEY.VTYPE;
					instruction.subs.push( {
						id : 1,
						error : '',
						indicator : '',
						screen : 'IMG02',
						full : 'SETSENDIF(IMG02,SEND,' + srcVector + ')',
						func : 'SETSENDIF',
						source : srcVector,
						destination : 'SEND',
						IDX : 1
					} );
					instruction.subs.push( {
						id : 2,
						error : '',
						indicator : '',
						screen : 'IMG02',
						full : 'SETSENDIF(IMG02,DISPLAY,' + srcVector + ')',
						func : 'SETSENDIF',
						source : srcVector,
						destination : 'DISPLAY',
						IDX : 2
					} );
					instruction.subs.push( {
						id : 3,
						error : '',
						indicator : '',
						screen : 'IMG02',
						full : 'SETSENDIF(IMG02,SEND,SEND)',
						func : 'SETSENDIF',
						source : 'SEND',
						destination : 'SEND',
						IDX : 3
					} );
					currentScreen.setResume( false );
					currentScreen.saveData( instruction );

					// the IMG screens have lower case field names. Some of these calling screens have lower and some have upper.
					// if this screen has upper case we need some temp lower case fields with the same values to be able to pass the data
					// through the IMG screens.
					var passedData = currentScreen.getPassedData( instruction.screen );
					passedData.data.push( {
						name : 'image',
						value : imageData,
						dest : 'SEND'
					} );
					if ( currentScreen.itemKeys.STORERKEY.NAME != currentScreen.itemKeys.STORERKEY.NAME.toLowerCase( ) ) {
						var StorerWidget = currentScreen.itemKeys.STORERKEY;
						var ItemWidget = currentScreen.itemKeys.ITEMKEY;
						var UOMWidget = currentScreen.itemKeys.UOM;

						passedData.data.push( {
							name : StorerWidget.NAME.toLowerCase( ),
							value : StorerWidget.getRawValue( ),
							dest : 'SEND'
						} );
						passedData.data.push( {
							name : StorerWidget.NAME.toLowerCase( ),
							value : StorerWidget.getRawValue( ),
							dest : 'DISPLAY'
						} );
						passedData.data.push( {
							name : ItemWidget.NAME.toLowerCase( ),
							value : ItemWidget.getRawValue( ),
							dest : 'SEND'
						} );
						passedData.data.push( {
							name : ItemWidget.NAME.toLowerCase( ),
							value : ItemWidget.getRawValue( ),
							dest : 'DISPLAY'
						} );
						passedData.data.push( {
							name : UOMWidget.NAME.toLowerCase( ),
							value : UOMWidget.getRawValue( ),
							dest : 'SEND'
						} );
						passedData.data.push( {
							name : UOMWidget.NAME.toLowerCase( ),
							value : UOMWidget.getRawValue( ),
							dest : 'DISPLAY'
						} );
					}
					currentScreen.setPassedData( instruction.screen, passedData );
					controller.initScreen( instruction.screen, false, instruction.repeat );
				}
			} ).fail( function( error ) {
				displayPageError( SCElocalize( "Error_Image_Server_Error", error.status ), function( ) {
					currentScreen.enableScreen( );
					controller.clearInProcess( );
				}, false );
			} ).always( function( anything ) {
			} );
			return;
		} else {
			var instruction = new InforMetaExpression( );
			instruction.func = 'SENDIF';
			instruction.screen = 'IMG02A';
			instruction.full = 'SENDIF(IMG02A,1,(TRUE))';
			var srcVector = currentScreen.itemKeys.STORERKEY.VTYPE;
			instruction.subs.push( {
				id : 1,
				error : '',
				indicator : '',
				screen : 'IMG02A',
				full : 'SETSENDIF(IMG02A,SEND,' + srcVector + ')',
				func : 'SETSENDIF',
				source : srcVector,
				destination : 'SEND',
				IDX : 1
			} );
			instruction.subs.push( {
				id : 2,
				error : '',
				indicator : '',
				screen : 'IMG02A',
				full : 'SETSENDIF(IMG02A,DISPLAY,' + srcVector + ')',
				func : 'SETSENDIF',
				source : srcVector,
				destination : 'DISPLAY',
				IDX : 2
			} );
			currentScreen.setResume( true );
			currentScreen.LKUPCALLED = true;
			currentScreen.saveData( instruction );

			// the IMG screens have lower case field names. Some of these calling screens have lower and some have upper.
			// if this screen has upper case we need some temp lower case fields with the same values to be able to pass the data
			// through the IMG screens.
			var StorerWidget = currentScreen.itemKeys.STORERKEY;
			var ItemWidget = currentScreen.itemKeys.ITEMKEY;
			var UOMWidget = currentScreen.itemKeys.UOM;
			var passedData = currentScreen.getPassedData( instruction.screen );

			passedData.data.push( {
				name : StorerWidget.NAME.toLowerCase( ),
				value : StorerWidget.getRawValue( ),
				dest : 'SEND'
			} );
			passedData.data.push( {
				name : StorerWidget.NAME.toLowerCase( ),
				value : StorerWidget.getRawValue( ),
				dest : 'DISPLAY'
			} );
			passedData.data.push( {
				name : 'storer',
				value : StorerWidget.getRawValue( ),
				dest : 'SEND'
			} );
			passedData.data.push( {
				name : 'storer',
				value : StorerWidget.getRawValue( ),
				dest : 'DISPLAY'
			} );
			passedData.data.push( {
				name : ItemWidget.NAME.toLowerCase( ),
				value : ItemWidget.getRawValue( ),
				dest : 'SEND'
			} );
			passedData.data.push( {
				name : ItemWidget.NAME.toLowerCase( ),
				value : ItemWidget.getRawValue( ),
				dest : 'DISPLAY'
			} );
			passedData.data.push( {
				name : 'sku',
				value : ItemWidget.getRawValue( ),
				dest : 'SEND'
			} );
			passedData.data.push( {
				name : 'sku',
				value : ItemWidget.getRawValue( ),
				dest : 'DISPLAY'
			} );
			passedData.data.push( {
				name : UOMWidget.NAME.toLowerCase( ),
				value : UOMWidget.getRawValue( ),
				dest : 'SEND'
			} );
			passedData.data.push( {
				name : UOMWidget.NAME.toLowerCase( ),
				value : UOMWidget.getRawValue( ),
				dest : 'DISPLAY'
			} );
			passedData.data.push( {
				name : 'uom',
				value : UOMWidget.getRawValue( ),
				dest : 'SEND'
			} );
			passedData.data.push( {
				name : 'uom',
				value : UOMWidget.getRawValue( ),
				dest : 'DISPLAY'
			} );

			currentScreen.setPassedData( instruction.screen, passedData );
			this.initScreen( instruction.screen, false, instruction.repeat );
		}
	},

	nextScreen : function( exitCode, status ) {
		if ( isDebugOn( 'SCREENFLOW' ) )
			console.debug( 'SCREENFLOW', 'NEXT SCREEN', 'current screen', currentScreen.screenName, inFieldGroupCheck );
		var theScreen = currentScreen;
		try {
			theScreen.exitCode = exitCode;
			if ( theScreen.MENU )
				return;

			theScreen.syncDisplayState( );
			var msg = theScreen.verifyBeforeNextScreen( );
			if ( msg ) {
				displayPageError( msg );
				return;
			}

			if ( theScreen.currPage < theScreen.maxPage && status != 2 ) {
				if ( isDebugOn( 'SCREENFLOW' ) )
					console.debug( screenDebug( 'SCREENFLOW', 'current screen', currentScreen.screenName, 'controller next screen, show next page of same screen' ) );
				theScreen.currPage += 1;
				theScreen.buildScreen( true, false, true, false );
				return;
			}

			if ( exitCode == InforMetaScreen.EXIT_NEXT ) {
				// user triggered this, we aren't resuming
				theScreen.resetScreenInfo( false );
				if ( theScreen.SELECTOR && theScreen.EXITONENTER )
					theScreen.setExit( true, 'exitonenter' );
			}

			if ( theScreen.screenName == 'L1' ) {
				if ( !dialogOpen )
					ws.sendMessage( appConfig.loginProc, buildSendString( appConfig.loginProc ), null, null, false );
			} else if ( theScreen.DISPLAYONLY || theScreen.NOXMIT ) {
				var done = null;
				if ( exitCode == InforMetaScreen.EXIT_USER ) {
					done = theScreen.determineNextStep( 'ONENTER' );
					if ( done ) {
						this.changeScreen( done, false );
						return;
					}
				}

				done = theScreen.determineNextStep( 'SENDIF' );
				if ( done ) {
					if ( isDebugOn( 'SCREENFLOW' ) )
						console.debug( 'SCREENFLOW', theScreen.screenName, 'new Screen', 'execute a SENDIF command', done );
					this.changeScreen( done, false );
					return;
				}
				if ( isDebugOn( 'SCREENFLOW' ) )
					console.debug( 'SCREENFLOW', theScreen.screenName, 'no more SENDIF to process' );

				done = theScreen.determineNextStep( 'DISPLAYMESSAGE' );
				if ( done ) {
					if ( isDebugOn( "SCREENFLOW" ) )
						console.debug( 'SCREENFLOW', this.screenName, 'new Screen', 'execute a DISPLAYMESSAGE command', done.func );
					theScreen.displayYesNoDialog( done );
					return;
				}
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( 'SCREENFLOW', this.screenName, 'no more DISPLAYMESSAGE to process' );

				done = theScreen.determineNextStep( 'IFRECEIVE' );
				if ( done ) {
					if ( isDebugOn( 'SCREENFLOW' ) )
						console.debug( 'SCREENFLOW', theScreen.screenName, 'new Screen', 'execute a IFRECEIVE command', done );
					this.changeScreen( done, false );
					return;
				}
				if ( isDebugOn( 'SCREENFLOW' ) )
					console.debug( 'SCREENFLOW', theScreen.screenName, 'no more IFRECEIVE to process' );

				done = theScreen.determineNextStep( 'ERROR', 1 );
				if ( done ) {
					if ( done.func == 'ERRORYESNO' ) {
						this.displayYesNoDialog( done );
					} else if ( done.func == 'ERROR' ) {
						if ( this.EXITONERROR )
							this.setExit( true, 'exitonerror' );
						if ( isDebugOn( 'SCREENFLOW' ) )
							console.debug( 'SCREENFLOW', theScreen.screenName, 'new Screen', 'execute a ERROR command', done );
						controller.changeScreen( done, false );
					} else if ( done.func == 'ERRORWARNING' ) {
						displayPageError( done.msg );
					}
					return;
				}

				if ( isDebugOn( 'SCREENFLOW' ) )
					console.debug( 'SCREENFLOW', theScreen.screenName, 'no more ERROR to process' );

				var cNumTimes = theScreen.getCurrNumTimes( );
				var numTimes = theScreen.getNumTimes( );
				cNumTimes += 1;
				theScreen.setCurrNumTimes( cNumTimes );
				if ( theScreen.getExit( ) || ( numTimes != -1 && cNumTimes >= numTimes ) ) {
					if ( isDebugOn( 'SCREENFLOW' ) )
						console.debug( 'SCREENFLOW', 'trigger prev Screen', 'screen flagged as exit OR numtimes exceeded', theScreen.screenName, 'menu? here?', this.MENU, 'exitScreen?', theScreen.getExit( ), 'numTimes', numTimes, 'currtNumTimes', cNumTimes );
					controller.prevScreen( InforMetaScreen.EXIT_PREV );
					return;
				}
			} else {
				theScreen.disableScreen( true );
				if ( ws ) {
					// if we do proc a SENDIF here, we can't do a send string until the
					// SENDIF returns back to this currentScreen.
					var done = theScreen.determineNextStep( 'SENDIF' );
					if ( done ) {
						this.changeScreen( done, false );
						return;
					}
					theScreen.xmitDone = true;
					ws.sendMessage( theScreen.procName, buildSendString( theScreen.procName, theScreen.appFlag ), null, null, false );
					// processing picks up in WebSocket onMessage code
				} else {
					return;
				}
			}
		} finally {
		}
	},

	prevScreen : function( exitCode ) {
		if ( isDebugOn( 'SCREENFLOW' ) )
			console.debug( 'SCREENFLOW', 'prevScreen', 'current screen', currentScreen.screenName );
		var theScreen = currentScreen;
		if ( theScreen.currPage > 1 && exitCode != InforMetaScreen.EXIT_PREV ) {
			// only move back to previous page of the current screen
			// if the user initiated it by pressing ESC. Otherwise, drop the current screen
			// and go to the previous screen.
			theScreen.currPage -= 1;
			theScreen.buildScreen( true, false, false, false );
			return;
		}

		if ( theScreen.hasCancel && exitCode === InforMetaScreen.EXIT_CANCEL ) {
			// if the cancel expression is FALSE at this point, the user can not cancel out
			// of the screen. Screen must exit through normal means.
			var done = theScreen.determineNextStep( 'CANCEL', 1 );
			if ( done ) {
				theScreen.state.CANCEL = 1;
				theScreen.setExit( true, 'user cancel' );
				controller.changeScreen( done, false );
				return;
			} else {
				displayPageError( SCElocalize( "Error_CannotCancel" ) );
			}
			return;
		}

		theScreen.exitCode = exitCode;

		// currently at the very first screen, can't go back anymore.
		if ( this.getScreenStackSize( ) == 0 ) {
			whseDlg.inforOpen( );
			return;
		}

		if ( theScreen.incomingData && theScreen.incomingData.length > 0 ) {
			if ( isDebugOn( 'SCREENFLOW' ) )
				console.debug( 'SCREENFLOW', theScreen.screenName, 'has non empty incomingData object, check if ret data to process' );
			var idx = 0, tIdx = 0, setret = null, tempData = null, aLength = theScreen.incomingData.length, bLength = 0;

			for ( ; idx < aLength; ++idx ) {
				tempData = theScreen.incomingData[ idx ];
				if ( tempData.retdata && tempData.retdata.length > 0 ) {
					if ( isDebugOn( 'SCREENFLOW' ) )
						console.debug( 'SCREENFLOW', theScreen.screenName, 'has instructions to pass data back to caller', tempData.retdataScreen );
					var saveObject = theScreen.getPassedData( tempData.retdataScreen );
					if ( !saveObject ) {
						// there isn't data going back to the screen so make a new one
						saveObject = {};
						saveObject.data = [ ];
						saveObject.retdata = [ ];
						saveObject.retdataScreen = '';
					}

					if ( isDebugOn( 'LOADDATA' ) )
						console.debug( 'LOADDATA', 'setret data', theScreen.screenName, tempData.retdataScreen, tempData.retdata );
					for ( tIdx = 0, bLength = tempData.retdata.length; tIdx < bLength; ++tIdx ) {
						setret = tempData.retdata[ tIdx ];
						theScreen.copyVectorToVector( saveObject.data, setret.source, setret.destination, tempData.retdataScreen, false );
					}
					theScreen.setPassedData( tempData.retdataScreen, saveObject );
				} else {
					if ( isDebugOn( 'SCREENFLOW' ) )
						console.debug( 'SCREENFLOW', theScreen.screenName, 'has NO instructions to pass data back to caller' );
				}

				if ( tempData.searchResultData || theScreen.searchResultData ) {
					var saveObject = theScreen.getPassedData( tempData.retdataScreen );
					if ( !saveObject ) {
						// there isn't data going back to the screen so make a new one
						saveObject = {};
						saveObject.data = [ ];
						saveObject.retdata = [ ];
						saveObject.retdataScreen = '';
						saveObject.searchResultData = ( theScreen.searchResultData ? theScreen.searchResultData : tempData.searchResultData );
					} else {
						saveObject.searchResultData = ( theScreen.searchResultData ? theScreen.searchResultData : tempData.searchResultData );
					}

					theScreen.setPassedData( tempData.retdataScreen, saveObject );
				}
			}
			theScreen.incomingData = [ ]; // processed retdata commands, reset it.
		} else {
			if ( isDebugOn( 'SCREENFLOW' ) )
				console.debug( 'SCREENFLOW', theScreen.screenName, 'has an empty incomingData object, no ret data to process' );
		}

		// three reasons we can go back a screen.
		// user exit (-1)
		// screen is XMTONLY and completed it's run (1)
		// screen has executed numTimes and is done.
		var theScreen = this.popScreenStack( );
		var state = this.popStateStack( );
		theScreen.state = state;
		if ( theScreen.screenName === 'L1' ) {
			whseDlg.inforOpen( );
		} else {
			this.initScreen( theScreen.screenName, true, theScreen.getNumTimes( ) );
		}
	},

	pushScreenStack : function( screen ) {
		this.screenStack.push( screen );
		this.stateStack.push( screen.createStateObject( true ) );
	},

	popScreenStack : function( ) {
		return this.screenStack.pop( );
	},

	popStateStack : function( ) {
		return this.stateStack.pop( );
	},

	peekScreenStack : function( ) {
		return this.screenStack[ this.screenStack.length - 1 ];
	},

	getScreenStackSize : function( ) {
		return this.screenStack.length;
	},

	setTopMenu : function( menu ) {
		if ( !this.topMenu ) {
			this.topMenu = menu;
		}
	},

	buttonPress : function( name, fromKeyEvent ) {
		if ( !fromKeyEvent && ( controller.inProcess( ) || ws.socket.sending ) ) {
			if ( isDebugOn( "SCREENFLOW" ) )
				console.debug( screenDebug( "", currentScreen, "Menu button pressed", "app is processing, ignore press." ) );
			return;
		}
		if ( name == 'menumore' ) {
			// grabs next set of menu items.
			var idx = currentScreen.screenName.indexOf( '-SCEUI' );
			var nextMenu = '';
			if ( idx != -1 ) {
				// assuming we won't have more than -SCEUI9 menus.
				var nextMenuID = parseInt( currentScreen.screenName.substring( idx + 6 ) ) + 1;
				nextMenu = currentScreen.screenName.substring( 0, idx ) + '-SCEUI' + nextMenuID;
			} else {
				nextMenu = currentScreen.screenName + '-SCEUI1';
			}
			controller.setInProcess( );
			this.initScreen( nextMenu, false, -1 );

		} else if ( name == 'MORE' ) {
			currentScreen.currPage += 1;
			currentScreen.buildScreen( false, false, false, false );
			return;

		} else {
			if ( currentScreen ) {
				var idx = 0, inst = currentScreen.parsedInstructData, len = inst.length, i = null;

				for ( ; idx < len; ++idx ) {
					i = inst[ idx ];
					if ( i.func === 'SETSCREEN' && i.screen === name ) {
						currentScreen.saveData( i );
					}
				}
			}
			controller.setInProcess( );
			this.initScreen( name, false, -1 );
		}
	},

	specialButtonPress : function( key ) {
		if ( currentScreen.SELECTOR ) {
			var focusCSS = appConfig.columns === 1 ? 'focusCol1' : appConfig.columns === 2 ? 'focusCol2' : 'focusCol3';
			var content = selectorDIV.find( '#selectorContent' );
			var theRow = content.find( '.SCE-Meta-LayoutRow.' + focusCSS );

			if ( theRow.length === 0 ) {
				displayPageError( SCElocalize( "Error_DetailViewNotActive" ), null );
				event.preventDefault( );
				return false;
			} else {
				if ( typeof key === 'number' )
					key = KEYMAP[ key ]; // convert number to text of key to look for instructions

				var p = currentScreen.getInstructionByKeyStroke( key );
				if ( !p )
					return false;

				if ( currentScreen.EXITONKEY === true )
					currentScreen.setExit( true, 'exitonkey' );
				currentScreen.setResume( false );
				this.changeScreen( p, false );
				return true;
			}
		} else {
			var p = currentScreen.getInstructionByKeyStroke( key );
			if ( !p )
				return false;

			if ( currentScreen.EXITONKEY === true )
				currentScreen.setExit( true, 'exitonkey' );

			currentScreen.setKeyStroke( true );
			currentScreen.setResume( false );
			this.changeScreen( p, false );
			return true;
		}
	},

	getResume : function( ) {
		if ( currentScreen && currentScreen.resume )
			return true;

		return false;
	},

	setResume : function( resume ) {
		if ( currentScreen )
			currentScreen.resume = resume;
	},

	searchResultNav : function( action ) {
		if ( currentScreen ) {
			currentScreen.searchResultNav( action );
		}
	},

	clearScreenCache : function( ) {
		var key = null;
		for ( key in this.screens ) {
			if ( isDebugOn( 'SCREENFLOW' ) )
				console.debug( simpleDebug( 'SCREENFLOW', 'removing screen from cache', this.screens[ key ] ) );
		}

		this.screens = [ ];
	},

	dumpScreenStack : function( ) {
		var idx = 0, screens = this.screenStack, s = null, l = screens.length;
		if ( isDebugOn( 'SCREENSTACK' ) )
			console.debug( 'SCREENSTACK', padString( 'NAME', 15 ), padString( 'XMITONLY', 10 ), padString( 'EXIT', 8 ), padString( 'resume', 8 ) );
		for ( ; idx < l; ++idx ) {
			s = screens[ idx ];
			if ( isDebugOn( 'SCREENSTACK' ) )
				console.debug( 'SCREENSTACK', padString( s.screenName, 15 ), padString( s.XMITONLY, 10 ), padString( s.getExit( ), 8 ), padString( s.resume, 8 ) );
		}
	},

	dumpVariableScreenPath : function( ) {
		var args = arguments, idx = 1, wIdx = 0, widgets = null, widget = null, l = arguments.length, wLength = 0;

		var n = args[ 0 ];
		for ( ; idx < l; ++idx ) {
			var s = controller.screens[ args[ idx ] ];
			if ( !s ) {
				if ( isDebugOn( 'LOADDATA' ) )
					console.debug( 'LOADDATA', args[ idx ], 'screen not loaded yet' );
			} else {
				widgets = s.getAllWidgetsByName( n );
				for ( wIdx = 0, wLength = widgets.length; wIdx < wLength; ++wIdx ) {
					widget = widgets[ wIdx ];
					if ( widget )
						if ( isDebugOn( 'LOADDATA' ) )
							console.debug( 'LOADDATA', '\t', args[ idx ], '\t', widget.NAME, '\t', widget.WTYPE, '\t', widget.TEXT, '\t', widget.RVALUE, '\t', widget.DVALUE, '\t', widget.EDITSTATE );
				}
			}
		}
	}
};
