var inforMetaScreenVersion = '11.0.1.0006';

/*

 */
function InforMetaScreen( NAME ) {
	this.screenName = NAME ? NAME.toUpperCase( ) : '';
	this.screenID = -1;
	this.screenDesc = '';
	// procedure name used by this screen to submit data
	this.procName = '';
	this.appFlag = '';

	// all fields
	this.fieldData = [ ];

	// only fields that COULD be displayed
	this.screenFields = [ ];

	// fields used for selector rows
	this.selectorFields = [ ];

	// key-vector value pairs of data per record returned;
	this.selectorData = [ ];

	// tracks which field group is currently in action.
	this.currentFieldGroup = null;

	// data fields by vector
	this.VECTORS = {
		RECEIVE : [ ],
		SEND : [ ],
		DISPLAY : [ ],
		HEADER : [ ],
		FOOTER : [ ]
	};

	// holds any widgets that contains a 2D barcode data tag
	this.DBNAMES = {};

	// widgets with field groups
	this.FGS = {};

	// widgets with a dynamic default and a list of their inputs
	this.DD = {
		length : 0
	};

	this.hasLookupField = false;

	this.CFP_TOP = 1;
	this.CFP_BTM = appConfig.RFHeight; // 16 by default

	// if set determines which field get focus first when a screen starts.
	this.firstField = null;
	// used for VALIDATEINPUT so we know which field is the last one we need
	// to draw.
	this.lastField = null;

	// all instructions
	this.instructData = [ ];
	this.parsedInstructData = [ ];
	// true if a CANCEL instruction exists.
	this.hasCancel = false;
	// maximum number of pages this screen will take to display
	this.maxPage = 1;
	// current page being displayed out of maxPage pages.
	this.currPage = 1;
	// which field we are up to for a VALIDATEINPUT style screen.
	this.validateRow = 1;
	// unused
	this.displayText = null;
	// message associated with the xmitReturnCode
	this.xmitMessage = '';
	// flag to track if the XMIT has been done
	this.xmitDone = false;
	// flag to know if there are KEYSTROKE commands on this screen
	this.hasFKEYS = false;
	// set when calling a lookup search result screen
	this.LKUPCALLED = false;
	// item key for use in retrieving images. Fields will point to
	// widgets that contain the values to fill an item image retrieve request
	this.itemKeys = {
		STORERKEY : null,
		ITEMKEY : null,
		UOM : null
	};

	this.globals = {
		hasGlobals : false,
		SEND : {},
		RECEIVE : {},
		DISPLAY : {}
	};

	// state flags.
	// anything in here is local to a call of a screen and not global across all
	// copies of the screen in process.
	this.state = {
		SENDIF : -1, // index of last instruction processed
		IFRECEIVE : -1, // index of last instruction processed.
		ERROR : -1,
		ONENTER : -1,
		CANCEL : -1,
		ERRORCODE : 1,
		DISPLAYMESSAGE : -1,
		exitScreen : false,
		numTimes : -1,
		currNumTimes : 1,
		// when this screen gets resumed, this flag is checked and when set to true
		// the screen will not resume and instead issue a prevScreen command.
		doResumeProc : true
	};

	// when this screen gets resumed, this flag is checked and when set to true
	// the screen will not resume and instead issue a prevScreen command.
	this.cancelScreen = false;

	// not used
	this.exitCode = InforMetaScreen.EXIT_NORMAL;
	// flag to show if this screen is a fresh call or is being reactived.
	this.resume = false;
	// data being passed into this screen from other screens
	this.incomingData = [ ];
	// no user input allowed regardless of widget settings. Readonly mode
	this.DISPLAYONLY = false;
	// screen is never displayed, acts only as a means to execute a procedure call
	this.XMITONLY = false;
	// screen is input only, passing off user input values to a different screen
	// for processing
	this.NOXMIT = false;
	// screen is a menu
	this.MENU = false;
	// after user commits, do not return to this screen.
	this.EXITONENTER = false;
	// if fkey hit, do fkey but do not return to this screen
	this.EXITONKEY = false;
	// at end of visible fields, auto commit instead of displaying prompt
	this.AUTOENTER = false;
	// screen scrolls through a record set, allowing the user to choose one.
	this.SELECTOR = false;
	// if skip over a blank field, commit the screen
	this.SKIPONBLANK = false;
	// if a display screen has an error, leave it.
	this.EXITONERROR = false;
	// on a selector screen, if a user selects a record remove it from the array
	this.DELETEONENTER = false;
	// This screen is displaying a list of values to be selected for a LOOKUP
	// function
	this.SEARCHRESULT = false;
	// do not paginate the screen.
	this.SHOWSINGLESCREEN = false;
	// do not process input as a barcode scan
	this.NOBRCDPARSE = false;
	// affects how the screen is displayed for editable fields.
	this.VALIDATEINPUT = false;
};

InforMetaScreen.prototype = {
	addGlobal : function( p ) {
		var fields = p.source.split( '->' );
		var vector = p.func.substring( 6 );

		if ( !this.globals[ vector ].hasOwnProperty( p.errorCode ) )
			this.globals[ vector ][ p.errorCode ] = {};

		this.globals[ vector ][ p.errorCode ] = {
			screen : p.screen,
			field : fields[ 1 ]
		};
		this.globals.hasGlobals = true;
	},
	addSelectorFocusWidgets : function( theRow ) {
		var minRow = 0, fields = this.screenFields, fieldsLength = fields.length, maxRow = fieldsLength, // 0 based rows;
		idx = 0, widget = null;

		theRow.html( '' );

		// .8 comes from the 'focus' CSS style. Because the row
		// animates open, we don't have the real row width until the animate
		// completes, which will happen AFTER this method finishes.
		var maxWidth = ( appConfig.columns > 1 ? appConfig.columnWidth * ( appConfig.columns - 1 ) : appConfig.columnWidth ) * 0.85;
		var weighting = maxWidth / appConfig.RFWidth;

		for ( idx = 0; idx < fieldsLength; ++idx ) {
			widget = fields[ idx ];

			if ( !widget.isVisible( ) || widget.VPOS < minRow || widget.VPOS > maxRow ) {
				continue;
			}

			this.createWidget( theRow, widget, true, weighting, minRow, maxRow, true );
		}
	},
	addSelectorWidgets : function( ) {
		var html = '', datas = this.selectorData, dataLength = datas.length, data = null, didx = 0, width = appConfig.columnWidth * 0.93;

		var rowPosClass = '';
		for ( didx = 0; didx < dataLength; ++didx ) {
			data = datas[ didx ];
			rowPosClass = didx === 0 ? ' firstRow' : didx + 1 == dataLength ? ' lastRow' : '';
			if ( didx === 0 ) {
				this.setRecordNumber( 1 );
				this.setRecordNumber( );
				rowPosClass += ' selected';
			}
			html = html + '<div class="SCE-Meta-LayoutRow' + rowPosClass + '" rname="' + didx + '" style="width: ' + width + 'px;">';
			html = html + this.createSelectorRow( data );
			html = html + '</div>';
		}

		selectorDIV.find( '#selectorDetail' ).html( '' );
		selectorDIV.find( '#selectorContent' ).html( '' ).append( html );
		selectorDIV.find( '#selectorContent' ).find( '.SCE-Meta-LayoutRow' ).click( this.inforHandleClickSelector );
		selectorDIV.find( '#selectorContent' ).find( '.SCE-Meta-LayoutRow > label' ).click( this.inforHandleClickSelector );

		if ( appConfig.columns === 1 ) {
			$( '#selectorToolbarArea' ).css( {
				width : '98%'
			} );
		} else {
			$( '#selectorToolbarArea' ).css( {
				width : '49%'
			} );
		}

		if ( dataLength == 1 ) {
			var theRow = selectorDIV.find( '#selectorContent' ).find( '.SCE-Meta-LayoutRow.selected' );
			var focusCSS = appConfig.columns == 1 ? 'focusCol1' : 'focusCol2';
			theRow.addClass( focusCSS );
			this.copySelectorDataToWidgets( theRow );
			this.addSelectorFocusWidgets( selectorDIV.find( '#selectorDetail' ) );
			this.showSelectorDetail( );
		} else {
			this.closeSelectorDetail( );
		}
	},
	adjustRows : function( updateValidateRows ) {
		this.restoreScreenFields( updateValidateRows );
		var widget;
		var wPerRow = [ ];
		var usedRows = [ ];
		var idx = 0;
		var rowIdx = 0;
		var size = this.screenFields.length;

		for ( idx = 0; idx < size; ++idx ) {
			widget = this.screenFields[ idx ];

			if ( ( this.SELECTOR && ( widget.NAME == 'selector' || widget.NAME == 'rcount' || widget.NAME == 'recnum' || widget.NAME == 'rectotal' ) ) || ( this.SEARCHRESULT && ( widget.NAME == 'selector' ) ) || ( this.VALIDATEINPUT && !widget.INPUT && widget.WTYPE === WIDGET_LABEL && widget.isBlank( ) ) ) {
				// hide the control fields for selector screens. we are doing something different
				// in WebRF and we don't want these shown
				widget.EXPR_VIS = '0';
			}

			// if we're a VALIDATEINPUT screen and we're a widget with a REAL
			// property it means this current widget was created to display the input to be
			// validated against. However, if we're this FAKE widget and the
			// REAL widget isn't going to get displayed OR the REAL widget isn't
			// going to be editable then there is no reason to show the FAKE widget, so hide
			// it here.
			if ( this.VALIDATEINPUT && widget.REAL && ( ( widget.WTYPE != WIDGET_LABEL && widget.REAL.isReadonly( ) ) || ( widget.WTYPE === WIDGET_LABEL && ( !widget.REAL.INPUT || widget.REAL.INPUT.isReadonly( ) ) ) ) ) {
				widget.EXPR_VIS = '0';
			}

			if ( widget.isVisible( ) && ( !this.SEARCHRESULT || ( !this.VALIDATEINPUT && widget.getRawValue( ) != "" ) ) ) {
				if ( widget.STATIC == 1 ) {
					// mark row as used so we don't adjust fields into these rows.
					if ( usedRows.indexOf( widget.VPOS ) == -1 ) {
						usedRows.push( widget.VPOS );
					}
					continue; // don't adjust these.
				}

				if ( !wPerRow[ widget.VPOS ] ) {
					wPerRow[ widget.VPOS ] = [ ];
				}
				wPerRow[ widget.VPOS ].push( idx );
				continue;
			}

			// can't see it, mark it so it will get put at the end of the list of widgets.
			widget.VPOS = 9999;
		}

		size = wPerRow.length;
		var rowID = 0;
		for ( idx = 0; idx < size; ++idx ) {
			if ( wPerRow[ idx ] ) {
				// we have stuff to show, advance to next row.
				++rowID;
				while ( usedRows.indexOf( rowID ) != -1 ) {
					++rowID;
				}
			} else {
				// empty row, skip it.
				continue;
			}

			for ( rowIdx = 0; rowIdx < wPerRow[ idx ].length; ++rowIdx ) {
				widget = this.screenFields[ wPerRow[ idx ][ rowIdx ] ];
				widget.VPOS = rowID;
				if ( widget.WTYPE == 3 ) {
					rowID = rowID + widget.NUMLINES - 1;
				}
			}
		}

		if ( this.SHOWSINGLESCREEN ) {
			this.maxPage = 1;
		} else {
			this.maxPage = this.calculateMaxPages( rowID + 1 );
		}

		sortArrayByKey( this.screenFields, [
				{
					key : 'VPOS'
				}, {
					key : 'HPOS'
				}
		] );

		size = this.screenFields.length;
		var newRowsPerPage = this.calculateMaxRowsPerPage( );
		var rowsPerColumn = this.calculateMaxRowsPerColumn( );
		var appConfigColumns = ( this.MENU ? 1 : appConfig.columns );
		var colLength = ( this.MENU ? 1 : appConfig.columns );
		var maxRow1 = 1, minRow1 = 1, maxRow2 = 1, minRow2 = 1, page1 = 1, page2 = 1, col1 = 1, col2 = 1, adj = 0, depWidget = null, tWidget = null;

		for ( idx = 0; idx < size; ++idx ) {
			widget = this.screenFields[ idx ];
			if ( ( widget.LABEL && widget.LABEL.VPOS != widget.VPOS ) ) {
				depWidget = widget.LABEL;
				page1 = Math.ceil( ( widget.VPOS + 1 ) / newRowsPerPage );
				page2 = Math.ceil( ( depWidget.VPOS + 1 ) / newRowsPerPage );
				maxRow1 = this.calculateMaxRowID( rowsPerColumn, colLength, page1 );
				minRow1 = this.calculateMinRowID( maxRow1, rowsPerColumn );

				if ( page1 === page2 ) {
					maxRow2 = maxRow1;
					minRow2 = minRow1;
				} else {
					maxRow2 = this.calculateMaxRowID( rowsPerColumn, colLength, page2 );
					minRow2 = this.calculateMinRowID( maxRow2, rowsPerColumn );
				}
				col1 = this.fitsInColumnOnPage( widget, rowsPerColumn, minRow1, maxRow1 );
				col2 = this.fitsInColumnOnPage( depWidget, rowsPerColumn, minRow2, maxRow2 );

				if ( page1 != page2 || col1 != col2 ) {
					adj = 0;
					//
					// keep pushing the widget down until it's on one page and one column.
					//
					while ( page1 <= this.maxPage && ( page1 != page2 || col1 != col2 ) ) {
						depWidget.VPOS += 1;
						widget.VPOS += 1;
						if ( isDebugOn( "SCREENBUILD" ) )
							console.debug( widgetDebug( 'SCREENBUILD', widget, 'NEW VPOS', widget.VPOS ) );
						if ( isDebugOn( "SCREENBUILD" ) )
							console.debug( widgetDebug( 'SCREENBUILD', depWidget, 'NEW VPOS', depWidget.VPOS ) );
						++adj;

						page1 = this.getWidgetPage( widget, newRowsPerPage );
						page2 = this.getWidgetPage( depWidget, newRowsPerPage );
						maxRow1 = this.calculateMaxRowID( rowsPerColumn, appConfigColumns, page1 );
						minRow1 = this.calculateMinRowID( maxRow1, rowsPerColumn );
						if ( page1 === page2 ) {
							maxRow2 = maxRow1;
							minRow2 = minRow1;
						} else {
							maxRow2 = this.calculateMaxRowID( rowsPerColumn, appConfigColumns, page2 );
							minRow2 = this.calculateMinRowID( maxRow2, rowsPerColumn );
						}
						col1 = this.fitsInColumnOnPage( widget, rowsPerColumn, minRow1, maxRow1 );
						col2 = this.fitsInColumnOnPage( depWidget, rowsPerColumn, minRow2, maxRow2 );
					}

					//
					// now take everything that was below the widget and push it all down as well
					//
					for ( rowIdx = idx + 1; rowIdx < size; ++rowIdx ) {
						tWidget = this.screenFields[ rowIdx ];
						if ( tWidget.ID === depWidget.ID )
							continue;
						tWidget.VPOS += adj;
					}
				}
			}
		}

		sortArrayByKey( this.screenFields, [
				{
					key : 'VPOS'
				}, {
					key : 'HPOS'
				}
		] );

		// footers are reverse ordered, place them all on the bottom most rows.
		// renumber footers so they are 1..N since the footer area is its own div, so
		// calculating the 'top' value is from within the container and not the whole body;
		var size = this.VECTORS[ 'FOOTER' ].length;
		for ( idx = 0; idx < size; ++idx ) {
			this.VECTORS[ 'FOOTER' ][ idx ].VPOS = size - idx - 1;
		}
	},

	/*
	 * MENU screens no longer go through this, there is a separate function for that.
	 */
	addWidgets : function( fieldReset, validateInputTriggered ) {
		var firstField = null;
		var widget;
		var weighting = appConfig.columnWidth / appConfig.RFWidth;
		var editable = this.hasEditableFields( );
		this.hasLookupField = false;
		headerDIV.height( appConfig.headerHeight );
		var rowsPerColumn = this.calculateMaxRowsPerColumn( );

		// HEADER
		var fields = this.VECTORS[ 'HEADER' ];
		var fieldsLength = fields.length;
		for ( var idx = 0; idx < fieldsLength; ++idx ) {
			widget = fields[ idx ];
			if ( widget.isVisible( ) ) {
				this.createWidget( headerDIV, widget, fieldReset, weighting );
			}
		}

		// FOOTER
		fields = this.VECTORS[ 'FOOTER' ];
		fieldsLength = fields.length;
		for ( var idx = 0; idx < fieldsLength; ++idx ) {
			widget = fields[ idx ];
			if ( widget.EXPR_VIS != '0' ) {
				this.createWidget( footerDIV, widget, fieldReset, weighting );
			}
		}

		if ( this.SELECTOR )
			return;

		var col = -1, colLength = ( appConfig.columns ), maxRow = this.calculateMaxRowID( rowsPerColumn, colLength, this.currPage ), minRow = this.calculateMinRowID( maxRow, rowsPerColumn );

		fields = this.screenFields;
		fieldsLength = fields.length;
		for ( var idx = 0; idx < fieldsLength; ++idx ) {
			widget = fields[ idx ];
			if ( fieldReset )
				widget.inDisplaySync = false;

			if ( this.VALIDATEINPUT && widget.isVisible( ) ) {
				this.lastField = widget;
			}

			if ( !widget.isVisible( ) || ( this.SEARCHRESULT && widget.getRawValue( ) === "" ) ) {
				continue;
			}

			//
			// if someone put an OPTIONSKEY on a screen with editable fields, that's just bad.
			// optionskey can only be on read only screens. So hide the help message!
			// In the key presss event, it will get ignored and the key will go straight into
			// the input field.
			//
			if ( widget.NAME.startsWith( 'OPTIONSKEY_HELPLINE' ) && editable ) {
				continue;
			}

			col = this.fitsInColumnOnPage( widget, rowsPerColumn, minRow, maxRow );

			if ( col < 0 || ( this.VALIDATEINPUT && widget.VPOS > this.validateRow ) )
				continue;

			var tempH = widget.HPOS;
			var tempV = widget.VPOS;
			if ( widget.HPOS + widget.VIS_LEN > appConfig.RFWidth ) {
				widget.VIS_LEN = appConfig.RFWidth - widget.HPOS;
			}
			widget.HPOS = widget.HPOS + ( col * appConfig.RFWidth );
			widget.VPOS = widget.VPOS - ( col * maxRow ) + ( col * ( minRow - 1 ) );
			var blankFieldOrNot = fieldReset;
			if ( validateInputTriggered && widget.VPOS === this.validateRow ) {
				// we are on the LAST validate input row so show it blank.
				// if we aren't on the last row allow the inputs to retain their values.
				blankFieldOrNot = true;
			}
			this.createWidget( layoutDIV, widget, blankFieldOrNot, weighting, minRow, maxRow );
			widget.HPOS = tempH;
			widget.VPOS = tempV;

			switch ( widget.WTYPE ) {
				case WIDGET_INPUT :
				case WIDGET_DATE :
				case WIDGET_MULTI : {
					if ( this.SEARCHRESULT ) {
						layoutDIV.find( '#' + widget.ID ).click( this.handleSearchResultClick );
					} else if ( widget.isLookUp( ) ) {
						layoutDIV.find( "#" + widget.ID ).focusout( this.handleBlur ).keyup( this.handleKeyUp ).focus( this.handleFocus ).keydown( this.handleLookup );
					} else {
						layoutDIV.find( "#" + widget.ID ).focusout( this.handleBlur ).keyup( this.handleKeyUp ).focus( this.handleFocus ).on( 'textInput', this.handleTextInput );
					}
					break;
				}
				case WIDGET_CHOICE : {
					layoutDIV.find( "#" + widget.ID ).change( this.handleBlur ).focus( this.handleFocus );
					break;
				}
			}

			if ( this.VALIDATEINPUT || ( !firstField && widget.canHaveFocus( ) ) ) {
				firstField = widget;
			}
		}
		if ( this.maxPage > 1 ) {
			var tWidget = new InforMetaWidget( this );
			tWidget.NAME = 'PAGECOUNTER';
			tWidget.VTYPE = 'DISPLAY';
			tWidget.WTYPE = 0;
			tWidget.EXPR_VIS = '1';
			tWidget.VPOS = maxRow + 1; // row reserved for this counter.
			tWidget.HPOS = 0;
			tWidget.VIS_LEN = appConfig.RFWidth;
			tWidget.setValue( SCElocalize( 'PageFooter', this.currPage, this.maxPage ) );
			this.createWidget( layoutDIV, tWidget, fieldReset, weighting, minRow, maxRow );
		}
		return firstField;
	},
	addMENUWidgets : function( ) {
		var widget;
		var weighting = appConfig.columnWidth / appConfig.RFWidth;
		this.hasLookupField = false;
		headerDIV.height( appConfig.headerHeight );

		// HEADER
		var fields = this.VECTORS[ 'HEADER' ];
		var fieldsLength = fields.length;
		for ( var idx = 0; idx < fieldsLength; ++idx ) {
			widget = fields[ idx ];
			if ( widget.isVisible( ) ) {
				this.createWidget( headerDIV, widget, true, weighting );
			}
		}

		// FOOTER
		fields = this.VECTORS[ 'FOOTER' ];
		fieldsLength = fields.length;
		for ( var idx = 0; idx < fieldsLength; ++idx ) {
			widget = fields[ idx ];
			if ( widget.EXPR_VIS != '0' ) {
				this.createWidget( footerDIV, widget, true, weighting );
			}
		}

		fields = this.screenFields;
		fieldsLength = fields.length;
		var isOldMenuType = false;
		var menuFields = [ ];
		for ( var idx = 0; idx < fieldsLength; ++idx ) {
			widget = fields[ idx ];
			if ( widget.VTYPE == 'SEND' && widget.isVisible( ) ) {
				menuFields.push( widget );
				if ( widget.NAME.indexOf( '-SCEUI' ) != -1 ) {
					isOldMenuType = true;
				}
			}
		}

		var rowsPerColumn = this.calculateMaxRowsPerColumn( );
		if ( rowsPerColumn < menuFields.length ) {
			// account for the More... item.
			--rowsPerColumn;
		}

		var colLength = 1, maxRow = this.calculateMaxRowID( rowsPerColumn, colLength, this.currPage ) - 1, minRow = this.calculateMinRowID( maxRow, rowsPerColumn );

		var menuMoreWidget = null;
		fields = menuFields;
		fieldsLength = fields.length;
		var slot = 0;
		for ( var currentMenuIdx = 0; currentMenuIdx < fieldsLength; ++currentMenuIdx ) {
			widget = fields[ currentMenuIdx ];

			if ( isOldMenuType ) {
				// menu only has 9 menu options and then 1 MORE already included. Just add
				// the widget and go.
				this.createWidget( layoutDIV, widget, true, weighting, minRow, maxRow );
			} else {
				// Calculate VPOS for widgets on multi-page MENU screens
				if ( currentMenuIdx < minRow || currentMenuIdx > maxRow ) {
					continue;
				}

				var tempV = widget.VPOS;
				widget.VPOS = ++slot;
				this.createWidget( layoutDIV, widget, true, weighting, minRow, maxRow );
				widget.VPOS = tempV;

				if ( currentMenuIdx === maxRow && currentMenuIdx < fieldsLength ) {
					menuMoreWidget = new InforMetaWidget( this );
					menuMoreWidget.copy( widget, false );
					menuMoreWidget.NAME = 'MORE';
					menuMoreWidget.ID = 'MORE';
					menuMoreWidget.VTYPE = 'SEND';
					menuMoreWidget.VPOS = slot + 1;
					menuMoreWidget.RVALUE = SCElocalize( 'menumore' );
					menuMoreWidget.TEXT = SCElocalize( 'menumore' );
					menuMoreWidget.MCOLOR = '#737373';
					this.createWidget( layoutDIV, menuMoreWidget, true, weighting, minRow, maxRow );
					continue;
				}
			}
			layoutDIV.find( "#" + widget.ID ).focusout( this.handleBlur ).keyup( this.handleKeyUp ).focus( this.handleFocus ).on( 'textInput', this.handleTextInput );
		}

		return null;
	},
	buildScreen : function( forceRebuild, updateValidateRows, fieldReset, validateInputTriggered ) {
		try {
			keyCancelHackForIntermecBrowser = false;
			this.setCurrentFieldGroup( );
			this.resetScreenDisplays( );
			if ( fieldReset && !this.XMITONLY && !this.resume && this.currPage == 1 ) {
				var idx = 0, flds = this.screenFields, size = flds.length, widget = null;
				for ( ; idx < size; ++idx ) {
					widget = flds[ idx ];
					widget.reset( );
				}
			}

			if ( this.SELECTOR ) {
				this.buildScreenSELECTOR( );
			} else {
				layoutDIV.show( );
				selectorDIV.hide( );

				if ( this.currPage == 1 && !this.LKUPCALLED ) {
					this.adjustRows( updateValidateRows );

					if ( this.VALIDATEINPUT && updateValidateRows ) {
						// first time through, initialize the first validateRow that has input
						this.validateRow = 0;
						this.validateRow = this.findNextValidateField( );
					}
				}

				this.firstField = this.MENU ? this.addMENUWidgets( ) : this.addWidgets( fieldReset, validateInputTriggered );

				// handles the paste event
				if ( appConfig.isTablet )
					this.setTabletKeyEvents( );
				this.enableScreen( );

				if ( appConfig.isTablet ) {
					$( '#prevScreenButton' ).enable( );
					if ( this.MENU ) {
						$( '#nextScreenButton' ).disable( );
					} else {
						$( '#nextScreenButton' ).enable( );
					}
				}
			}

			if ( !this.MENU ) {
				this.showFunctionKeyButtons( );
			} else {
				$( '#specialKeys' ).hide( );
				$( '#specialKeysTablet' ).hide( );
				$( '#screenCodeDIV' ).html( '' ).append( '<label class="inforLabel noColon" style="font-size:1.0em;">' + currentScreen.screenName + '</label>' ).show( );
			}

			if ( !inFieldGroupCheck ) {
				if ( isDebugOn( 'KEYEVENT' ) )
					console.debug( simpleDebug( 'KEYEVENT', 'keyCancel', keyCancelHackForIntermecBrowser ) );
				this.setFirstFieldFocus( );
			} else {
				if ( isDebugOn( 'WIDGET' ) )
					console.debug( screenDebug( 'WIDGET', this, 'in field group check, not setting focus', '' ) );
			}
		} finally {
			controller.clearInProcess( );
		}
	},
	buildScreenSELECTOR : function( ) {
		selectorDIV.show( );
		layoutDIV.hide( );
		this.adjustRows( );

		// get a widget template for the first 6 fields displayed.
		if ( this.selectorFields.length === 0 ) {
			var fields = this.screenFields;
			var fieldsLength = fields.length;
			var idx, widget, pass = 0;

			// two pass system here.
			// First pass we only grab widgets that contain data.
			// Second pass we'll take empty widgets but ONLY if the
			// first pass did not get us a template(selectorFields) at all
			for ( ; pass <= 1 && this.selectorFields.length === 0; ++pass ) {
				for ( idx = 0; idx < fieldsLength; ++idx ) {
					widget = fields[ idx ];
					if ( widget.WTYPE == WIDGET_LABEL // no labels in template
							|| widget.WTYPE == WIDGET_MULTI // no multi line fields
							|| !widget.isVisible( ) // has to be visible, duh
							|| ( pass === 0 && !widget.LABEL ) // inputs need to have a label to go with it
							|| ( pass === 0 && widget.isBlank( ) ) ) // on pass two, we don't care about blanks
						continue;

					this.selectorFields.push( widget );
					if ( ( pass === 0 && this.selectorFields.length >= 6 ) || ( pass === 1 && this.selectorFields.length >= 3 ) ) {
						break;
					}
				}
			}

			if ( this.selectorFields.length === 0 ) {
				// if we've made it through the 2 passes above and can't get at
				// least ONE
				// widget for the template then flag an error!
				displayPageError( SCElocalize( 'Error_NoSelectorTemplate', this.screenName ), function( ) {
					controller.prevScreen( InforMetaScreen.EXIT_CANCEL );
				} );
				return;
			}
		}

		this.addWidgets( ); // handles just header and footer
		this.addSelectorWidgets( );
		this.enableScreen( );
	},
	calculateMaxRowsPerPage : function( ) {
		var rowsPerColumn = this.calculateMaxRowsPerColumn( );

		if ( this.maxPage > 1 ) {
			if ( this.MENU ) {
				return rowsPerColumn;
			} else {
				return rowsPerColumn * appConfig.columns;
			}
		} else {
			return rowsPerColumn * ( this.MENU ? 1 : appConfig.columns );
		}
	},
	calculateMaxRowsPerColumn : function( ) {
		if ( this.MENU ) {
			return 10;
		} else {
			var maxRowsPerColumn = this.maxPage > 1 ? appConfig.rows - 1 : appConfig.rows;
			if ( this.VALIDATEINPUT && ( maxRowsPerColumn % 2 == 1 ) ) {
				maxRowsPerColumn -= 1; // validate inputs go in pairs. if we're odd rows, push it down to an even number
			}
			return maxRowsPerColumn;
		}
	},
	calculateMaxRowID : function( rowsPerColumn, colLength, page ) {
		return rowsPerColumn + ( rowsPerColumn * ( page - 1 ) * colLength );
	},

	calculateMinRowID : function( maxRow, rowsPerColumn ) {
		return maxRow - rowsPerColumn + 1;
	},

	createPassedData : function( p, toScreen, realTime, saveObject ) {
		if ( typeof realTime === 'undefined' ) {
			realTime = false;
		}

		if ( isDebugOn( "LOADDATA" ) )
			console.debug( screenDebug( 'LOADDATA', this, 'creating data bundle to pass :', 'SCREEN[' + toScreen + ']REALTIME[' + realTime + ']' ) );
		if ( typeof saveObject === 'undefined' ) {
			saveObject = {};
			saveObject.data = [ ];
			saveObject.retdata = [ ];
			saveObject.retdataScreen = this.screenName;
		}
		if ( typeof this.searchResultData !== 'undefined' ) {
			saveObject.searchResultData = this.searchResultData;
		}
		if ( p.subs && p.subs.length ) {
			var sub, subs = p.subs, l = subs.length, idx = 0;
			for ( ; idx < l; ++idx ) {
				sub = subs[ idx ];
				if ( sub.screen != toScreen )
					continue;

				if ( sub.func.substring( 0, 6 ) == 'SETRET' ) {
					saveObject.retdata.push( sub );
					// instructions to new screen to give us data back.
				} else if ( sub.func.substring( 0, 3 ) == 'SET' ) {
					this.copyVectorToVector( saveObject.data, sub.source, sub.destination, toScreen, realTime );
				}
			}
		}

		if ( saveObject.data.length > 0 || saveObject.retdata.length > 0 || saveObject.searchResultData || saveObject.selectorData )
			this.setPassedData( toScreen, saveObject );
		else
			this.setPassedData( toScreen, null );
	},
	createSelectorRow : function( theData, theRow ) {
		var fidx = 0, fields = this.selectorFields, fieldsLength = fields.length, widget = null, html = '', htmlTmpl = '<label class="inforLabel noColon SCE-Meta-LayoutRowCell SCE-Meta-LayoutWidget" >', lbl = '', val = '';

		if ( isDebugOn( "LOADDATA" ) )
			console.debug( 'LOADDATA', this.screenName, 'called with', theRow, theData, fieldsLength );

		for ( fidx = 0; fidx < fieldsLength; ++fidx ) {
			widget = fields[ fidx ];
			val = '';
			lbl = '';
			if ( theData[ widget.VTYPE + '_' + widget.NAME ] )
				val = theData[ widget.VTYPE + '_' + widget.NAME ];
			else
				val = widget.getDisplayValue( );

			if ( widget.LABEL )
				lbl = widget.LABEL.getDisplayValue( ) + ' ';

			if ( isDebugOn( "LOADDATA" ) )
				console.debug( 'LOADDATA', this.screenName, 'widget', widget.NAME, theData[ widget.VTYPE + '_' + widget.NAME ], val );

			if ( theRow )
				theRow.append( htmlTmpl + lbl + val + '</label>' );
			else
				html = html + htmlTmpl + lbl + val + '</label>';
		}

		return html;
	},
	createRequiredMarker : function( widget, top, left ) {
		if ( !this.SELECTOR )
			return '<div style="position:absolute; top:' + top + 'px; left:' + ( left - 2 ) + 'px;" class="inforRequiredIndicator"></div>';

		return '';
	},
	createMenuButtonWidget : function( widget, width, top, left ) {
		var numericID = parseInt( widget.VPOS - 1 ); // 0 to 9
		var tabIdx = ( widget.VPOS * 100 ) + widget.HPOS;
		var style = 'style="top:' + top + 'px; left:' + left + 'px; width:' + width + 'px;" ';
		if ( widget.TEXT_COLOR && widget.TEXT_COLOR.length > 0 ) {
			style = style + 'color:' + widget.TEXT_COLOR + ';';
		}

		// arrow is 22 char high.
		var arrowTop = ( top + ( appConfig.menuRowHeight / 2 ) ) - 11;

		var mcolor = typeof widget.MCOLOR === 'string' && widget.MCOLOR.length > 0 ? widget.MCOLOR : '#737373';

		return '' + '<button tabindex="' + tabIdx + '" type="button" class="inforTextButton SCE-Meta-LayoutMenu "' + ' ' + style + ' onclick="controller.buttonPress(\'' + widget.NAME + '\')">' + '<div class="SCE-Meta-LayoutMenuCircle " style="background-color:' + mcolor + '">' + numericID + '</div>' + widget.TEXT + '</button>' + ( widget.NAME != 'MORE' ? '<div class="SCE-Meta-IconArrow" style="top: ' + arrowTop + 'px;"></div>' : '' );
	},
	createTextViewWidget : function( widget, width, top, left ) {
		// -8 for CSS padding
		var css = widget.getVectorCSS( );
		var style = '';

		if ( css.indexOf( 'header' ) == -1 )
			style = 'top:' + top + 'px; left:' + left + 'px; width:' + ( width - 8 ) + 'px;';

		var cls = 'inforLabel noColon ' + css;
		if ( widget.NAME == 'PAGECOUNTER' )
			cls = cls + ' pager';
		else
			cls = cls + ' label';

		if ( widget.TEXT_COLOR && widget.TEXT_COLOR.length > 0 ) {
			style = style + 'color:' + widget.TEXT_COLOR + ';';
		}

		if ( appConfig.isTablet && widget.NAME.startsWith( 'OPTIONSKEY_HELPLINE' ) ) {
			return '<button type="button" class="inforFormButton ' + cls + '" ' + ' onClick="currentScreen.handleOptionsKey(\'' + widget.OPTIONSKEY + '\');" ' + ' style="' + style + '" >' + widget.getText( ) + '</button>';
		}

		return '<label rname="' + widget.NAME + '" vector="' + widget.VTYPE + '" id="' + widget.ID + '" class="' + cls + '" style="' + style + '" >' + widget.getText( ) + '</label>';
	},
	createDateWidget : function( widget, reset, width, top, left, alwaysBorder ) {
		var tabIdx = ( widget.VPOS * 100 ) + widget.HPOS;
		var style = 'top:' + top + 'px; left:' + left + 'px; width:' + width + 'px; padding-right: 3px;';
		var doEditState = ( !this.resume && reset ) || ( this.resume && !widget.inDisplaySync );
		var readonly = widget.isReadonly( ) ? ' readonly ' : '';
		var required = widget.isRequired( ) ? this.createRequiredMarker( widget, top, left ) : '';
		var cls = "inforTextbox " + widget.getVectorCSS( );
		var displayValue = readonly.length > 0 ? widget.getDisplayValue( ) : widget.getEditStateDisplayValue( doEditState );
		if ( alwaysBorder )
			cls = cls + ' border';

		if ( widget.BORDER ) {
			cls = cls + ' SCE-Meta-Border';
			style = style + 'border-color:' + widget.BCOLOR + ';';
		}

		if ( widget.BCK_COLOR && widget.BCK_COLOR.length > 0 ) {
			style = style + 'background-color:' + widget.BCK_COLOR + ';';
		}

		if ( widget.TEXT_COLOR && widget.TEXT_COLOR.length > 0 ) {
			style = style + 'color:' + widget.TEXT_COLOR + ';';
		}

		var html = required + '<input rname="' + widget.NAME + '" ' + 'type ="text" ' + 'placeholder="' + widget.getDateHintText( ) + '" ' + 'tabindex="' + tabIdx + '" ' + 'vector="' + widget.VTYPE + '" ' + 'id="' + widget.ID + '" ' + 'class="' + cls + '" ' + 'style="' + style + '" ' + 'value="' + displayValue + '" ' + readonly + '>';
		return html;
	},
	createEditTextWidget : function( widget, reset, width, top, left, alwaysBorder ) {

		// pattern, place RegEx into field to validate input
		var tabIdx = ( widget.VPOS * 100 ) + widget.HPOS;

		var doEditState = ( !this.resume && reset ) || ( this.resume && !widget.inDisplaySync );

		var isLK = widget.isLookUp( );
		var lkup = '';
		if ( isLK ) {
			width -= 20;
			lkup = '<button ' + ' type="button"' + ' class="inforIconButton search"' + ' onclick="currentScreen.handleLookup(\'' + widget.NAME + '\',\'' + widget.VTYPE + '\');"' + ' style="position:absolute; top:' + top + 'px; left:' + ( left + width - 10 ) + 'px;"><span></span></button>';
		}

		// -10 for CSS
		var style = 'top:' + top + 'px; left:' + left + 'px; width:' + ( width - 10 ) + 'px;';
		var readonly = widget.isReadonly( ) ? ' readonly ' : '';
		var required = widget.isRequired( ) ? this.createRequiredMarker( widget, top, left ) : '';
		var cls = "inforTextbox " + widget.getVectorCSS( );
		var type = widget.MASK.indexOf( '%' ) != -1 ? ' type="number" min="0.0" step="1" ' : ' type="text" ';
		var pattern = widget.MASK.indexOf( '%' ) != -1 ? 'pattern="^\d+\.?\d{0,2}$"' : '';
		var displayValue = readonly.length > 0 ? widget.getDisplayValue( ) : widget.getEditStateDisplayValue( doEditState );
		if ( alwaysBorder )
			cls = cls + ' border';

		if ( widget.BORDER ) {
			cls = cls + ' SCE-Meta-Border';
			style = style + 'border-color:' + widget.BCOLOR + ';';
		}

		if ( widget.BCK_COLOR && widget.BCK_COLOR.length > 0 ) {
			style = style + 'background-color:' + widget.BCK_COLOR + ';';
		}

		if ( widget.TEXT_COLOR && widget.TEXT_COLOR.length > 0 ) {
			style = style + 'color:' + widget.TEXT_COLOR + ';';
		}
		//
		// the autocorrect, spellcheck and autocomplete are turned off for Mobile Chrome
		// on Android. We can't get keycodes during key events with these turned on! That's
		// and Android design 'feature'
		//
		var html = required + '<input autocapitalize="off"' + ' autocorrect="off"' + ' spellcheck="false"' + ' autocomplete="off"' + ' rname="' + widget.NAME + '"' + ' tabindex="' + tabIdx + '"' + ' vector="' + widget.VTYPE + '"' + ' id="' + widget.ID + '"' + ' class="' + cls + '"' + ' placeholder="' + widget.HINT_TEXT + '"' + ' ' + readonly + ' style="' + style + '"' + ' ' + type + ' ' + pattern + ' value="' + displayValue + '" >' + lkup;
		return html;
	},
	createChoiceDisplayWidget : function( widget, reset, width, top, left ) {
		var tabIdx = ( widget.VPOS * 100 ) + widget.HPOS;
		var minWidth = 50;
		width = width < minWidth ? minWidth : width;
		var minLeft1 = appConfig.columnWidth - minWidth;
		var minLeft2 = ( appConfig.columnWidget * 2 ) - minWidth;
		if ( left > minLeft1 && left < appConfig.columnWidth ) {
			width = appConfig.columnWidth - minLeft1; // minimum placement
			left = minLeft1;
		} else if ( left > appConfig.columnWidth && left > minLeft2 ) {
			width = ( appConfig.columnWidth * 2 ) - minLeft2;
			left = minLeft2;
		} else {
			// left = left - 20;
			width = width - 10;
			width = width < minWidth ? minWidth : width;
		}
		var style = 'top:' + top + 'px; left:' + left + 'px; width:' + ( width ) + 'px;';
		var readonly = widget.isReadonly( ) ? ' disabled ' : '';
		var required = widget.isRequired( ) ? this.createRequiredMarker( widget, top, left ) : '';
		var cls = "inforDropdownList " + widget.getVectorCSS( );
		if ( widget.isRequired )
			cls = cls + ' required ';

		if ( widget.BORDER ) {
			cls = cls + ' SCE-Meta-Border';
			style = style + 'border-color:' + widget.BCOLOR + ';';
		}

		if ( widget.BCK_COLOR && widget.BCK_COLOR.length > 0 ) {
			style = style + 'background-color:' + widget.BCK_COLOR + ';';
		}

		if ( widget.TEXT_COLOR && widget.TEXT_COLOR.length > 0 ) {
			style = style + 'color:' + widget.TEXT_COLOR + ';';
		}

		var editStateValue = widget.getEditStateDisplayValue( true );

		var html = required + '<select rname="' + widget.NAME + '"' + ' tabindex="' + tabIdx + '"' + ' class="' + cls + '"' + ' vector="' + widget.VTYPE + '"' + ' id="' + widget.ID + '"' + readonly + ' style="' + style + '" >';

		html = html + '<option value=""></option>';
		var val, disp, sel;
		for ( var idx = 0, l = widget.CHOICE_DISPLAY.length; idx < l; ++idx ) {
			val = ' value="' + widget.CHOICE_VALUES[ idx ] + '" ';
			disp = widget.CHOICE_DISPLAY[ idx ];
			sel = editStateValue == widget.CHOICE_VALUES[ idx ] ? ' selected="selected" ' : '';
			html = html + '<option ' + sel + val + '>' + disp + '</option>';
		}

		html = html + '</select>';
		return html;
	},
	createMultiLine : function( widget, reset, width, top, left, alwaysBorder ) {
		var tabIdx = ( widget.VPOS * 100 ) + widget.HPOS;
		// -10 for CSS
		// padding of zero to override SOHO behavior
		var style = 'top:' + top + 'px; left:' + left + 'px; width:' + ( width - 10 ) + 'px; padding:0px; overflow-y:none;';
		var readonly = widget.isReadonly( ) ? ' readonly ' : '';
		var required = widget.isRequired( ) ? this.createRequiredMarker( widget, top, left ) : '';
		var doEditState = ( !this.resume && reset ) || ( this.resume && !widget.inDisplaySync );
		var displayValue = readonly.length > 0 ? widget.getDisplayValue( ) : widget.getEditStateDisplayValue( doEditState );

		var cls = "inforTextArea " + widget.getVectorCSS( );
		if ( alwaysBorder )
			cls = cls + ' border';

		if ( widget.BORDER ) {
			cls = cls + ' SCE-Meta-Border';
			style = style + 'border-color:' + widget.BCOLOR + ';';
		}

		if ( widget.BCK_COLOR && widget.BCK_COLOR.length > 0 ) {
			style = style + 'background-color:' + widget.BCK_COLOR + ';';
		}

		if ( widget.TEXT_COLOR && widget.TEXT_COLOR.length > 0 ) {
			style = style + 'color:' + widget.TEXT_COLOR + ';';
		}
		var html = required + '<textarea tabindex="' + tabIdx + '"' + ' rname="' + widget.NAME + '"' + ' rows="' + ( widget.NUMLINES ) + '"' + ' vector="' + widget.VTYPE + '"' + ' id="' + widget.ID + '"' + ' placeholder="' + widget.HINT_TEXT + '"' + ' class="' + cls + '"' + ' style="' + style + '"' + readonly + ' >' + displayValue + '</textarea>';
		return html;
	},

	createImageWidget : function( widget, reset, width, top, left, alwaysBorder ) {
		var imgHeight = widget.NUMLINES * appConfig.rowHeight;

		var style = 'top:' + ( top + 22 ) + 'px; left:' + left + 'px; width:' + ( width - 10 ) + 'px; height:' + imgHeight + 'px;';
		var cls = widget.getVectorCSS( );
		if ( alwaysBorder )
			cls = cls + ' border';

		if ( widget.BORDER ) {
			cls = cls + ' SCE-Meta-Border';
			style = style + 'border-color:' + widget.BCOLOR + ';';
		}

		if ( widget.BCK_COLOR && widget.BCK_COLOR.length > 0 ) {
			style = style + 'background-color:' + widget.BCK_COLOR + ';';
		}

		var html = '';

		if ( !widget.isReadonly( ) ) {
			var btnID = widget.ID + 'Button';
			html = '<input type="file"' + ' accept="image/*"' + ' id="' + btnID + '"' + ' name="' + btnID + '"' + ' rname="' + widget.NAME + '"' + ' vector="' + widget.VTYPE + '"' + ' class="inforFileField SCE-Meta-FileField"' + ' style="left:' + left + 'px;top:' + top + 'px;">';
		}

		html = html + ' <div rname="' + widget.NAME + '"' + ' vector="' + widget.VTYPE + '"' + ' id="' + widget.ID + '"' + ' class="' + cls + '"' + ' style="' + style + '"' + ' ></div>';

		return html;
	},

	createWidget : function( vectorDIV, widget, reset, weighting, minRow, maxRow, alwaysBorder ) {
		var width = 1;

		if ( !this.MENU ) {
			width = widget.VIS_LEN * parseInt( weighting );
		} else {
			width = appConfig.maxWidth - ( 4 * weighting );
		}

		var html = '';
		var top = 0;
		var left = 0;
		if ( widget.VTYPE == 'FOOTER' ) {
			left = widget.HPOS * weighting;
		} else if ( widget.VTYPE != 'HEADER' ) {
			if ( this.MENU ) {
				top = ( widget.VPOS - 1 ) * appConfig.menuRowHeight;
				left = 2 * weighting;
			} else {
				if ( this.currPage > 1 ) {
					top = ( widget.VPOS - minRow ) * appConfig.rowHeight;
				} else {
					top = ( widget.VPOS - 1 ) * appConfig.rowHeight;
				}
				left = widget.HPOS * weighting;
			}
		}

		if ( widget.VTYPE == 'HEADER' ) {
			var squish = widget.getRawValue( ).replace( currentScreen.screenName, '' );

			while ( squish.indexOf( '  ' ) != -1 ) {
				squish = squish.replace( /\s\s/g, ' ' );
			}
			widget.setValue( squish.trim( ) );
		}

		if ( this.MENU ) {
			if ( widget.VTYPE == 'HEADER' ) {
				vectorDIV.append( this.createTextViewWidget( widget, width, top, left ) );
			} else {
				vectorDIV.append( this.createMenuButtonWidget( widget, width, top, left ) );
			}
		} else {
			if ( isDebugOn( 'WIDGET' ) )
				console.debug( widgetDebug( 'WIDGET', widget, 'widget placement', '[' + top + '] [' + left + ']' ) );
			switch ( widget.WTYPE ) {
				case WIDGET_LABEL : // TextView = 0
					html = this.createTextViewWidget( widget, width, top, left );
					break;
				case WIDGET_INPUT : // EditText = 1
					html = this.createEditTextWidget( widget, reset, width, top, left, alwaysBorder );
					break;
				case WIDGET_CHOICE : // choice
					html = this.createChoiceDisplayWidget( widget, reset, width, top, left, alwaysBorder );
					break;
				case WIDGET_MULTI : // multi line
					html = this.createMultiLine( widget, reset, width, top, left, alwaysBorder );
					break;
				case WIDGET_DATE : // date
					html = this.createDateWidget( widget, reset, width, top, left, alwaysBorder );
					break;
				case WIDGET_IMAGE : // image
					html = this.createImageWidget( widget, reset, width, top, left, alwaysBorder );
					break;
				default :
					console.error( this.screenName, ' has widget [', widget.NAME, '] of unimplemented type [', widget.WTYPE, ']' );
			}

			if ( widget.LKUP && widget.LKUP.length > 0 )
				this.hasLookupField = true;

			vectorDIV.append( html );

			if ( widget.WTYPE == WIDGET_DATE ) {
				var fmt = widget.dateValue.datetime ? controller.dateTimeFmt : controller.dateFmt;
				$( '#' + widget.ID ).inforDateField( {
					dateFormat : fmt
				} );

				// SOHO width css stuff conflicts with our stuff. fix it.
				var self = $( '#' + widget.ID ).parent( ); // SOHO 'trigger' container;
				self.width( width + 50 ).find( '.inforDatePickerButton' ).css( {
					position : 'absolute',
					right : '0px'
				} );
				if ( widget.BORDER ) {
					self.css( {
						"border-color" : widget.BCOLOR
					} ).addClass( 'SCE-Meta-Border' );
				}

				if ( widget.BCK_COLOR && widget.BCK_COLOR.length > 0 ) {
					self.css( {
						"background-color" : widget.BCK_COLOR
					} );
				}

				// when the SOHO calendar button is clicked, it doesn't display in the right position for us
				// as we're small screen and SOHO assume full sized desktop pages.
				self.find( '.inforDatePickerButton' ).on( 'click', function( event ) {
					if ( isDebugOn( "KEYEVENT" ) )
						console.debug( simpleDebug( 'KEYEVENT', $( '#inforDatePicker-div' ).width( ), $( '#inforDatePicker-div' ).height( ) ) );
					$( '#inforDatePicker-div' ).css( {
						top : '0px',
						left : '0px'
					} );
				} );

				// by default the SOHO date widget will popup the calendar when you press
				// enter. We don't want this to happen, so turn off key handlers for the widget
				// and let SCE key handlers on the document handle the enter key
				$( '#' + widget.ID ).off( 'keydown' ).off( 'keypress' ).off( 'keyup' );
			} else if ( widget.WTYPE == WIDGET_IMAGE ) {
				var btnID = widget.ID + 'Button';
				var doEditState = ( !this.resume && reset ) || ( this.resume && !widget.inDisplaySync );
				var displayValue = widget.isReadonly( ) ? widget.getDisplayValue( ) : widget.getEditStateDisplayValue( doEditState );

				$( '#' + widget.ID ).css( {
					'background-image' : 'url("' + displayValue + '")'
				} );

				// this has issues in Intermec, needs to be figured out.
				$( '#' + btnID ).on( 'change', function( event ) {
					if ( isDebugOn( "IMAGE" ) )
						console.debug( simpleDebug( "IMAGE", "image has been selected", '' ) );
					var theWidget = InforMetaWidget.getWidgetFromJQueryObject( $( event.target ) );

					var theID = event.target.id;
					var theDisplay = event.target.id.replace( 'Button', '' );
					var theFile = document.getElementById( theID ).files[ 0 ];
					if ( theFile ) {
						theWidget.setImage( theFile, null, null );
						var reader = new FileReader( );
						reader.onloadend = function( ) {
						};
						reader.onload = function( e ) {
							if ( isDebugOn( "IMAGE" ) )
								console.debug( simpleDebug( "IMAGE", "image has been loaded", '' ) );
							var rawData = e.target.result; // in a base64 format like data:image/png;base64,
							if ( isDebugOn( "IMAGE" ) )
								console.debug( simpleDebug( "IMAGE", "image raw base64 size", rawData.length ) );
							$( '#' + theDisplay ).css( {
								'background-image' : 'url("' + rawData + '")'
							} );
							if ( theWidget ) {
								theWidget.setImage( theFile, rawData, null );
							}
						};
						reader.readAsDataURL( theFile );
					}
					this.focus( );
				} );
			}
		}
	},
	calculateMaxPages : function( totalVisibleRows ) {
		if ( isDebugOn( 'SCREENFLOW' ) )
			console.debug( screenDebug( 'SCREENFLOW', this, 'calculateMaxPages', totalVisibleRows ) );
		if ( this.MENU ) {
			this.maxPage = Math.ceil( totalVisibleRows / appConfig.rows );
			if ( this.maxPage > 1 )
				this.maxPage = Math.ceil( totalVisibleRows / ( appConfig.rows - 2 ) );
			return this.maxPage;
		} else {
			this.maxPage = Math.ceil( totalVisibleRows / ( appConfig.rows * appConfig.columns ) );
			if ( this.maxPage > 1 )
				this.maxPage = Math.ceil( totalVisibleRows / ( ( appConfig.rows - 1 ) * appConfig.columns ) );
			return this.maxPage;
		}
	},
	displayItemImageScreen : function( data ) {
		controller.callImageDisplayScreen( );
	},
	displayAboutDialog : function( ) {
		this.disableScreen( false );
		aboutDlg.inforOpen( );
	},
	displayYesNoDialog : function( p, handleYes, handleNo ) {
		if ( isDebugOn( "LOADDATA" ) )
			console.debug( 'LOADDATA', this.screenName, 'displayYesNoDialog' );
		this.disableScreen( false );
		$( '.inforDialog > .shortMessage' ).html( '' );
		$( '.inforDialog > .detailedMessage' ).html( '' );
		var msg = p.msg;
		if ( p.msg.indexOf( '->' ) != -1 ) {
			// it's a field most likely. find the field and use it's value.
			var fields = p.msg.split( '->' );
			if ( fields.length == 2 ) {
				var widget = this.getWidgetByName( fields[ 1 ], fields[ 2 ], true );
				if ( widget )
					msg = widget.getDisplayValue( );
			}
		}
		msg = decodeURIComponent( msg ).replace( /\+/gi, ' ' );

		var title = SCElocalize( "Confirmation" );
		var dialogType = "Confirmation";
		var buttons = [
				{
					text : SCElocalize( "Yes" ),
					click : function( ) {
						try {
							closeDialogs( );
							if ( handleYes )
								handleYes( p );
							else
								currentScreen.handleYesNoDialog( p, true );
						} catch ( err ) {
						}
					}
				}, {
					text : SCElocalize( "No" ),
					click : function( ) {
						try {
							closeDialogs( );
							if ( handleNo )
								handleNo( p );
							else
								currentScreen.handleYesNoDialog( p, false );
						} catch ( err ) {
						}
					}
				}
		];

		var handleYES = function( ) {
			try {
				closeDialogs( );
				if ( handleYes )
					handleYes( p );
				else
					currentScreen.handleYesNoDialog( p, true );
			} catch ( err ) {
			}
		};

		var handleNO = function( ) {
			try {
				closeDialogs( );
				if ( handleNo )
					handleNo( p );
				else
					currentScreen.handleYesNoDialog( p, false );
			} catch ( err ) {
			}
		};

		if ( p.func == 'DISPLAYMESSAGE' ) {
			title = p.mtype == '0' ? SCElocalize( 'MsgDlg_Alert' ) : SCElocalize( 'MsgDlg_Error' );
			dialogType = p.mtype == '0' ? 'Alert' : 'Error';
			if ( p.buttons == '0' ) {
				handleYes = function( ) {
					try {
						closeDialogs( );
						currentScreen.handleYesNoDialog( p, true );
					} catch ( err ) {
					}
				};
				handleNo = handleYes;
				buttons = [
					{
						text : SCElocalize( "Ok" ),
						click : function( ) {
							try {
								closeDialogs( );
								currentScreen.handleYesNoDialog( p, true );
							} catch ( err ) {
							}
						}
					}
				];
			} else {
				handleYes = function( ) {
					try {
						closeDialogs( );
						currentScreen.handleYesNoDialog( p, true );
					} catch ( err ) {
					}
				};
				handleNo = function( ) {
					try {
						closeDialogs( );
						currentScreen.handleYesNoDialog( p, false );
					} catch ( err ) {
					}
				};

				buttons = [
						{
							text : SCElocalize( "Ok" ),
							click : function( ) {
								try {
									closeDialogs( );
									currentScreen.handleYesNoDialog( p, true );
								} catch ( err ) {
								}
							}
						}, {
							text : SCElocalize( "Cancel" ),
							click : function( ) {
								try {
									closeDialogs( );
									currentScreen.handleYesNoDialog( p, false );
								} catch ( err ) {
								}
							}
						}
				];
			}
		}

		// check if we're on a selector screen with the detail view showing.
		// if it is, we need to make sure the z-index of the message is greater than
		// the selector detail or you can't see the message.

		if ( isDebugOn( "LOADDATA" ) )
			console.debug( 'LOADDATA', this.screenName, 'msg is', msg );
		$( '#yesNoDialog' ).inforMessageDialog( {
			title : title,
			shortMessage : '',
			detailedMessage : msg,
			dialogType : dialogType,
			showTitleClose : false,
			width : appConfig.popMaxWidth,
			height : 'auto',
			modal : true,
			autoFocus : true,
			draggable : false,
			closeOnEscape : false,
			open : function( ) {
				controller.clearInProcess( );
				dialogOpen = $( this );
				dialogOpen.inforHandleKeyPress = function( event ) {
					if ( event.which == KEYMAP[ 'enter' ] || event.which == KEYMAP[ 'escape' ] ) {
						event.preventDefault( );
						try {
							closeDialogs( );
							if ( event.which == KEYMAP[ 'enter' ] ) {
								handleYES( );
							} else {
								handleNO( );
							}
						} catch ( err ) {
						}
						return false;
					}
				};
				moveThisToTheFront( dialogOpen.parent( ) );
			},
			close : function( event, ui ) {
				dialogOpen = null;
			},
			buttons : buttons

		} );

		$( '#yesNoDialog' ).parent( ).focus( ).css( {
			'z-index' : 9999
		} );
	},

	// called when we transmit over the socket, to prevent user interaction.
	disableScreen : function( status ) {
		if ( status ) {
			var temp = typeof status === 'string' ? status : SCElocalize( "Working" );
			this.beginStatusBarProcessing( temp );
		}
		if ( this.XMITONLY )
			return;

		if ( appConfig.isTablet )
			$( '#prevScreenButton, #nextScreenButton' ).disable( );

		layoutDIV.find( '.SCE-Meta-LayoutWidget' ).attr( 'readonly', 'readonly' );
	},

	// called after a transmit has occurred, return control to user.
	enableScreen : function( ) {
		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( 'SCREENFLOW', 'isTablet', 'enableScreen', this.screenName, 'xmitonly', this.XMITONLY, 'disabled', this.disabled );

		if ( this.XMITONLY )
			return;

		if ( this.screenName == 'L1' ) {
			loginDIV.find( ".inforTextbox" ).enable( );
			$( '#port, #portLabel' ).hide( );
			if ( appConfig.showConnection === 'false' ) {
				$( '#server, #serverLabel' ).hide( );
			} else {
				$( '#server' ).attr( 'readonly', 'readonly' );
			}

			if ( appConfig.isTablet ) {
				$( "#prevScreenButton" ).disable( );
				$( "#nextScreenButton" ).enable( );
			}
		} else {
			if ( appConfig.isTablet ) {
				$( '#prevScreenButton' ).enable( );
				if ( !this.MENU ) {
					$( '#nextScreenButton' ).disable( );
				}
			}

			if ( !this.DISPLAYONLY ) {
				var widget = null, fields = this.screenFields, l = fields.length, idx = 0;
				for ( ; idx < l; ++idx ) {
					widget = fields[ idx ];
					if ( !widget.isReadonly( ) )
						layoutDIV.find( "#" + widget.ID ).removeAttr( 'readonly', '' );
					else
						layoutDIV.find( "#" + widget.ID ).attr( 'readonly', 'readonly' );
				}
			}
		}
		this.endStatusBarProcessing( );

	},

	/*
	 * Gets the widget the assigned to a key press by it's vector position in the SEND vector
	 */
	getMenuWidgetByNumber : function( number ) {
		if ( !this.MENU ) // only works for menu screens!
			return null;

		var widget;
		var widgetIdx = 0;
		var pageLength = this.screenFields.length;
		var rowsPerColumn = this.calculateMaxRowsPerColumn( );

		for ( var idx = widgetIdx; idx < pageLength; ++idx ) {
			widget = this.screenFields[ idx ];
			if ( widget.VTYPE == 'SEND' && widget.getDisplayValue( ) !== '' && parseInt( widget.VPOS - 1 ) == number ) {

				if ( this.currPage < this.maxPage && pageLength > 10 && number == 9 ) {
					// -------------------------------------------------------------------
					// Build a temporary 'More...' widget here, so as not to step on
					// the widget we are copying. All we need to accomplish is returning
					// a widget with widget.NAME=='MORE' to the caller.
					var menuMoreWidget = new InforMetaWidget( this );
					menuMoreWidget.NAME = 'MORE';
					return menuMoreWidget;
					// -------------------------------------------------------------------
				}

				widgetIdx = number + ( rowsPerColumn * ( ( this.currPage - 1 ) ) - ( this.currPage - 1 ) );
				widget = this.screenFields[ widgetIdx ];

				return widget;
			}
		}

		return null;
	},

	getInstructionByKeyStroke : function( key ) {
		for ( var idx = 0; idx < this.parsedInstructData.length; ++idx ) {
			var p = this.parsedInstructData[ idx ];
			if ( p.key == key )
				return p;
		}
		return null;
	},

	getPassedData : function( key ) {
		var data = null;
		key = key.toUpperCase( );
		if ( passedData.hasOwnProperty( key ) )
			data = passedData[ key ];

		return data;
	},

	getRecordNumber : function( ) {
		return this.currREC;
	},

	getRecordTotal : function( ) {
		return this.totalREC;
	},

	// have to be careful when calling this, only do it right after a xmit returns
	// and not anytime else
	getErrorCodeReturned : function( defError ) {

		if ( typeof defError === 'undefined' )
			defError = 1;

		var rectype = this.getWidgetByName( 'rectype', 'RECEIVE' );

		if ( rectype ) {
			var val = rectype.getRawValue( );
			// if we have a blank value in rectype, we need it to convert to a number
			// by default we'll convert it to a 1 ( success all good! )
			if ( isNaN( val ) ) {
				val = defError;
			} else {
				val = stringToInt( val );
			}
			rectype.setValue( val );
			if ( isDebugOn( "SCREENFLOW" ) )
				console.debug( sDebug( 'SCREENFLOW', this.screenName, '', '', 'returning rectype code', val ) );
			return val;
		}

		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( sDebug( 'SCREENFLOW', this.screenName, '', '', 'returning default code', defError ) );
		return defError;
	},

	getMessage : function( defMessage ) {
		var miscmsg = this.getWidgetByName( 'miscmsg', 'RECEIVE' );
		if ( miscmsg )
			return getValue( miscmsg.getRawValue( ) );

		return defMessage;
	},

	/*
	 * Checks through all screen widgets, even temporary ones created for rendering.
	 */
	getScreenWidgetByName : function( NAME ) {
		var theVector = this.screenFields;
		var size = 0, idx = 0;
		var widget = null;
		size = theVector.length;

		for ( ; idx < size; ++idx ) {
			widget = theVector[ idx ];
			if ( widget.NAME == NAME )
				return widget;
		}

		return null;
	},

	/*
	 * Only checks a specific vector for a widget or all the original fields Will not check for temporary widgets created for screen rendering.
	 */
	getWidgetByName : function( NAME, VECTOR, allowOtherVector ) {
		var theVector = null;
		var size = 0;
		var widget = null;

		if ( typeof VECTOR != 'undefined' ) {
			theVector = this.VECTORS[ VECTOR ];
		} else {
			theVector = this.fieldData;
		}

		size = theVector.length;
		for ( var idx = 0; idx < size; ++idx )
			if ( ( !VECTOR || VECTOR == theVector[ idx ].VTYPE ) && theVector[ idx ].NAME == NAME )
				return theVector[ idx ];

		if ( !VECTOR || !allowOtherVector )
			return null;

		if ( VECTOR != 'SEND' ) {
			widget = getWidgetByName( NAME, 'SEND', false );
			if ( widget )
				return widget;
		}
		if ( VECTOR != 'DISPLAY' ) {
			widget = getWidgetByName( NAME, 'DISPLAY', false );
			if ( widget )
				return widget;
		}
		if ( VECTOR != 'HEADER' ) {
			widget = getWidgetByName( NAME, 'HEADER', false );
			if ( widget )
				return widget;
		}
		if ( VECTOR != 'FOOTER' ) {
			widget = getWidgetByName( NAME, 'FOOTER', false );
			if ( widget )
				return widget;
		}

		return null;
	},

	getAllWidgetsByName : function( NAME ) {
		var theVector = this.fieldData, size = theVector.length, widget = null, widgets = [ ];

		for ( var idx = 0; idx < size; ++idx ) {
			widget = theVector[ idx ];
			if ( widget.NAME == NAME ) {
				widgets.push( widget );
			}
		}

		return widgets;
	},

	getWidgetsByRow : function( row ) {
		var rows = [ ];
		var fields = this.screenFields;
		var l = fields.length, sIdx = 0, widget;

		for ( ; sIdx < l; ++sIdx ) {
			widget = fields[ sIdx ];
			if ( widget.isVisible( ) && widget.VPOS == row )
				rows.push( widget );
		}

		return rows;
	},

	getGlobal : function( vector, order ) {
		var ret = null;

		try {
			order = '' + order;
			if ( this.globals.hasOwnProperty( vector ) && this.globals[ vector ].hasOwnProperty( order ) ) {
				var temp = this.globals[ vector ][ order ];
				if ( controller.screens[ temp.screen ] ) {
					var widget = controller.screens[ temp.screen ].getWidgetByName( temp.field, vector );
					if ( widget ) {
						ret = widget.getRawValue( );
					} else {
						ret = '';
					}
				} else {
					ret = '';
				}
			}
		} finally {
			if ( isDebugOn( "SCREENFLOW" ) )
				console.debug( 'SCREENFLOW', 'GETGLOBAL', this.screenName, ( ret !== null ? ( 'global found ' + ret ) : 'global not found' ), vector, order );
		}

		return ret;
	},

	getScanIdentifierValues : function( ) {
		var widget = null, widgets = this.fieldData, l = widgets.length, idx = 0, retData = {
			asn : '',
			order : '',
			item : '',
			owner : '',
			po : ''
		};

		for ( ; idx < l; ++idx ) {
			widget = widgets[ idx ];

			// skip the labels that go with EditText widgets
			// we want the value in the EditText itself and not it's label
			if ( widget.INPUT )
				continue;

			if ( retData.asn.length === 0 && widget.FORMAT_ID === 'ASN' )
				retData.asn = widget.getRawValue( );
			else if ( retData.owner.length === 0 && widget.FORMAT_ID === 'OWNER' )
				retData.owner = widget.getRawValue( );
			else if ( retData.order.length === 0 && widget.FORMAT_ID === 'ORDER' )
				retData.order = widget.getRawValue( );
			else if ( retData.item.length === 0 && widget.FORMAT_ID === 'ITEM' )
				retData.item = widget.getRawValue( );
			else if ( retData.po.length === 0 && widget.FORMAT_ID === 'PO' )
				retData.po = widget.getRawValue( );
		}
		if ( isDebugOn( 'BARCODE' ) )
			console.debug( screenDebug( 'BARCODE', this, 'scan identifers', retData.asn + '::' + retData.order + '::' + retData.owner + '::' + retData.item + '::' + retData.po ) );
		return retData;
	},

	handleYesNoDialog : function( p, answer ) {
		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( sDebug( 'SCREENFLOW', this.screenName, '', '', 'handleYesNo Start', answer ) );
		this.createPassedData( p, p.screen, p.screen === this.screenName );

		if ( answer ) {
			if ( p.screen ) {
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( sDebug( 'SCREENFLOW', this.screenName, '', '', 'handleYesNo: YES. next screen is ', p.screen ) );
				controller.initScreen( p.screen, false, p.repeat );
			} else {
				controller.setResume( true );
				this.resumeProcessing( false );
			}
		} else if ( !answer ) {
			if ( p.screen2 && p.screen2.length > 0 ) {
				this.createPassedData( p, p.screen2, p.screen2 === this.screenName );
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( sDebug( 'SCREENFLOW', this.screenName, '', '', 'handleYesNo: NO. next screen is ', p.screen2 ) );
				controller.initScreen( p.screen2, false, p.repeat2 );
			} else if ( this.XMITONLY ) {
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( sDebug( 'SCREENFLOW', this.screenName, '', '', 'handleYesNo: NO. There is no next screen and this is XMITONLY. Exiting.' ) );
				controller.prevScreen( InforMetaScreen.EXIT_PREV );
			} else {
				this.resumeProcessing( false );
			}
		}
	},
	handleBarCode : function( id, val, widget, handler ) {
		var IDVal = currentScreen.getScanIdentifierValues( );
		appConfig.barCode.getScanData( id, val, IDVal.asn, IDVal.order, IDVal.owner, IDVal.item, IDVal.po, {
			func : function( scanData, handlerData ) {
				if ( isDebugOn( 'BARCODE' ) )
					console.debug( simpleDebug( 'BARCODE', 'getScanData return', '' ) );
				decodeArray( scanData );
				var idx = 0, l = scanData.length;
				for ( ; idx < l; ++idx ) {
					var obj = scanData[ idx ];
					if ( isDebugOn( 'BARCODE' ) )
						console.debug( simpleDebug( 'BARCODE', 'scanData', obj.typ + '::' + obj.val ) );
					if ( currentScreen.DBNAMES[ obj.typ ] ) {
						for ( var vIdx = 0, vLength = currentScreen.DBNAMES[ obj.typ ].length; vIdx < vLength; ++vIdx ) {
							var tWidget = currentScreen.DBNAMES[ obj.typ ][ vIdx ];
							tWidget.setValue( obj.val );
							tWidget.inDisplaySync = true;
							$( '#' + tWidget.ID ).val( obj.val );
						}
					} else {
						if ( isDebugOn( 'BARCODE' ) )
							console.debug( simpleDebug( 'BARCODE', 'currentScreen.DBNAMES no entry for', obj.typ ) );
					}
				}
				if ( handler ) {
					handler( );
				}
			},
			widget : widget
		} );
	},
	handleBlur : function( event ) {
		if ( errorOpen || dialogOpen )
			return true;

		var self = $( this );
		var widget = InforMetaWidget.getWidgetFromJQueryObject( self );

		if ( isDebugOn( 'KEYEVENT' ) )
			console.debug( simpleDebug( 'KEYEVENT', 'handleBlur', self.attr( 'id' ) ) );
		if ( isDebugOn( 'KEYEVENT' ) )
			console.debug( simpleDebug( 'KEYEVENT', 'handleBlur', self.val( ) ) );

		if ( !widget )
			return true;

		var hval = $( this ).val( );
		widget.inDisplaySync = true;

		//
		// extended field properties.
		// field doesn't have focus anymore. put back
		// the custom background color now that the 'selected'
		// CSS doesn't apply anymore.
		//
		if ( widget.BCK_COLOR ) {
			self.css( {
				"background-color" : widget.BCK_COLOR
			} );
		}

		// need to keep the value in the widget object in sync with
		// what is displayed in the HTML input.
		//
		// However, if this widget has ECHO characters, then what's in the
		// HTML input is junk characters. The widget itself is the master value
		// in this case. It stays in sync through handleKeyUp events
		//
		if ( !widget.isEcho( ) )
			widget.setValue( hval );

		var val = widget.getRawValue( );

		if ( currentScreen.hasItemKeyData( ) )
			$( '#itemIMGButton' ).enable( );
		else
			$( '#itemIMGButton' ).disable( );

		var id = !this.NOBRCDPARSE && appConfig.barCode ? appConfig.barCode.exists( val ) : null;
		if ( id ) {
			// start of the value matches a barcode prefix. Send it off to the server for valdiation
			// lock screen and process barcode service call. this is an event handler, use currentScreen
			// to get at the screen and not 'this' in context 'this' is the HTML object
			currentScreen.disableScreen( SCElocalize( 'BarcodeProcessing' ) );
			currentScreen.handleBarCode( id, val, widget, function( ) {
				currentScreen.enableScreen( );
			} );
		} else {
			if ( widget.WTYPE === WIDGET_DATE && hval.length > 0 ) {
				// dates can get out of sync as they won't have a valid internal
				// date until the entire date is
				// entered.
				widget.setValue( hval );
				if ( widget.getRawValue( ).length <= 0 ) {
					self.val( '' );
					widget.setValue( '' );
					displayPageError( SCElocalize( "Error_InvalidDateInField", widget.NAME ), function( ) {
						self.focus( );
					} );
					event.preventDefault( );
					return false;
				}
			} else if ( !widget.validateContents( ) ) {
				self.val( '' );
				widget.setValue( '' );
				displayPageError( SCElocalize( "Error_InvalidDataInField", widget.NAME ), function( ) {
					self.focus( );
				} );
				event.preventDefault( );
				return false;
			}
		}

		return true;
	},

	handleTextInput : function( event ) {
		var self = $( event.target );
		try {
			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'handleTextInput start', self.val( ) ) );
			if ( errorOpen || dialogOpen )
				return true;

			var self = $( this );
			var widget = InforMetaWidget.getWidgetFromJQueryObject( self );

			if ( !widget )
				return true;

			if ( event.originalEvent && event.originalEvent.data ) {
				if ( isDebugOn( "KEYEVENT" ) )
					console.debug( simpleDebug( 'KEYEVENT', 'handleTextInput', event.originalEvent.data ) );
				widget.textInput = event.originalEvent.data;
			} else {
				if ( isDebugOn( "KEYEVENT" ) )
					console.debug( simpleDebug( 'KEYEVENT', 'handleTextInput', 'no event data' ) );
			}
		} finally {
			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'handleTextInput end', self.val( ) ) );
		}
	},

	// note: event.which = 229 is when input was done with a Android standard virtual keyboard.
	// all standard keys pressed register as 229 and not their normal keycode.
	// if we had character input we caught that input in the inputText event and we'll resume it here
	// in other event handlers we let is slip through, in key up we treat it as a 'control'
	handleKeyUp : function( event ) {
		var widget = null;
		var self = null;
		try {
			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'handleKeyUp start', event.which ) );
			if ( errorOpen || dialogOpen || event.which == 27 || event.which == 13 ) {
				if ( isDebugOn( "KEYEVENT" ) )
					console.debug( simpleDebug( 'KEYEVENT', 'handleKeyUp', 'ignore event' ) );
				return true;
			}

			self = $( event.target );
			widget = InforMetaWidget.getWidgetFromJQueryObject( self );

			if ( !widget )
				return true;

			var key = null;
			var keyFromInput = false;
			if ( event.which != 229 ) {
				// 229 codes come from *some* Android devices using a virtual keyboard.
				// newer and newer tablet versions are using this method now.
				// as long as we aren't getting 229 we can use event.which
				// otherwise we need to use the data we trapped in the textInput event
				key = String.fromCharCode( event.which );

				// we trapped it but it's not need because this is not a virtual keyboard
				// so its duplicate data.
				if ( widget.textInput )
					delete widget.textInput;
			} else if ( widget.textInput ) {
				if ( isDebugOn( "KEYEVENT" ) )
					console.debug( simpleDebug( 'KEYEVENT', 'handleKeyUp', widget.textInput ) );
				key = widget.textInput;
				delete widget.textInput;
				keyFromInput = true;
			}

			var val = self.val( );
			if ( widget.isEcho( ) ) {
				var widgetVal = widget.getRawValue( );
				if ( ( ( key === null && event.which === 229 ) || iscntrl( event.which, true ) ) && widgetVal.length > val.length ) {
					// user did something to remove a character. chop off the
					// end.
					widgetVal = widgetVal.substring( 0, val.length );
				}
				if ( widget.UPPER == 1 && key !== null )
					key = key.toUpperCase( );

				if ( key ) {
					widgetVal = widgetVal + ( iscntrl( event.which, true ) ? '' : key );
					widget.setValue( widgetVal );
				}
				self.val( widget.getDisplayValue( ) );
			} else {
				if ( widget.UPPER )
					val = val.toUpperCase( );

				widget.setValue( val );
				val = widget.getRawValue( );

				if ( widget.WTYPE === WIDGET_DATE ) {
					var newKey = parseInt( key );

					if ( ( !keyFromInput && ( event.which >= KEYMAP[ 'KEY0' ] && event.which <= KEYMAP[ 'KEY9' ] || event.which >= KEYMAP[ 'NUM0' ] && event.which <= KEYMAP[ 'NUM9' ] ) ) || ( keyFromInput && newKey >= 0 && newKey <= 9 ) ) {
						var currentValue = replaceAll( self.val( ), controller.dateSep + controller.dateSep, controller.dateSep );
						self.val( currentValue );
						currentValue = self.val( ).split( ' ' );
						var date = currentValue[ 0 ].split( controller.dateSep );
						var time = currentValue[ 1 ];
						if ( controller.dateFmtA ) {
							if ( date.length != controller.dateFmtA.length ) {
								var curFldSeg = date[ date.length - 1 ];
								var formatSeg = controller.dateFmtA[ date.length - 1 ];

								if ( formatSeg && curFldSeg.length === formatSeg.length ) {
									self.val( self.val( ) + controller.dateSep );
								}
							} else if ( widget.dateValue.datetime && !time ) {
								var curFldSeg = date[ date.length - 1 ];
								var formatSeg = controller.dateFmtA[ date.length - 1 ];

								if ( formatSeg && curFldSeg.length === formatSeg.length ) {
									self.val( self.val( ) + ' ' );
								}
							}
						}

						if ( controller.timeFmtA && time ) {
							time = time.split( controller.timeSep );

							if ( time.length != controller.timeFmtA.length ) {
								var curFldSeg = time[ time.length - 1 ];
								var formatSeg = controller.timeFmtA[ time.length - 1 ];

								if ( formatSeg && curFldSeg.length === formatSeg.length ) {
									self.val( self.val( ) + controller.timeSep );
								}
							}
						}
					}
				} else if ( widget.WTYPE != WIDGET_DATE && widget.USEMASK && widget.MASK && widget.MASK.length > 0 && val.length > widget.MASK.length ) {
					val = val.substring( 0, widget.MASK.length );
					widget.setValue( val );
					self.val( val );
				} else if ( widget.WTYPE != WIDGET_DATE && !iscntrl( event.which, true ) && self.attr( 'type' ) != 'number' ) {
					self.val( widget.getDisplayValue( ) );
				}

				if ( !widget.validateContents( ) ) {
					self.focus( ).validationMessage( "show", "invalid", true );
					event.preventDefault( );
					return false;
				} else {
					// in case we had an error before that is corrected now.
					self.validationMessage( "remove" );
				}
			}

			if ( event.which != 229 && !iscntrl( event.which, true ) ) {
				event.preventDefault( );
				return false;
			}
		} finally {
			if ( self )
				if ( isDebugOn( "KEYEVENT" ) )
					console.debug( simpleDebug( 'KEYEVENT', 'handleKeyUp self val', self.val( ) ) );
			if ( widget )
				if ( isDebugOn( "KEYEVENT" ) )
					console.debug( simpleDebug( 'KEYEVENT', 'handleKeyUp widget val', widget.getRawValue( ) ) );

			if ( isDebugOn( "KEYEVENT" ) )
				console.debug( simpleDebug( 'KEYEVENT', 'handleKeyUp end', '' ) );
		}
		return true;
	},

	handleFocus : function( event ) {
		$( '#lookupButton' ).disable( );
		$( '#helpContent' ).html( '' );
		var self = $( this );
		var widget = InforMetaWidget.getWidgetFromJQueryObject( self );

		if ( widget ) {
			try {
				// extended field properties.
				// remove the background color so the 'selected' CSS style
				// will take precedence
				if ( widget.BCK_COLOR ) {
					self.css( {
						"background-color" : ""
					} );
				}

				// selects all the text, if any, in the field
				if ( appConfig.autoSelectTextOnFocus === true ) {
					self.select( );
				}

				if ( widget.LKUP && widget.LKUP.length > 0 ) {
					$( '#lookupButton' ).enable( ).off( 'click' ).on( 'click', function( ) {
						currentScreen.handleLookup( widget.NAME, widget.VTYPE );
					} );
				} else if ( widget.CHOICE_HELP && widget.CHOICE_HELP.length > 0 ) {
					$( '#helpContent' ).html( widget.CHOICE_HELP );
				}

				if ( !inFieldGroupCheck && currentScreen.currentFieldGroup && widget.FGNAME !== currentScreen.currentFieldGroup ) {
					if ( isDebugOn( 'FGS' ) )
						console.debug( widgetDebug( 'FGS', widget, 'FOCUS:before handle field group', currentScreen.currentFieldGroup ) );

					if ( typeof widget.doNotFireFGHandler === 'undefined' || widget.doNotFireFGHandler === false )
						currentScreen.handleFGChange( widget );

				} else if ( !currentScreen.currentFieldGroup && widget.FGNAME.length > 0 ) {
					if ( isDebugOn( 'FGS' ) )
						console.debug( widgetDebug( 'FGS', widget, 'setting new field group', widget.FGNAME ) );
					currentScreen.currentFieldGroup = widget.FGNAME;
				}
			} finally {
				if ( widget.doNotFireFGHandler )
					delete widget.doNotFireFGHandler;
			}
		}

		//
		// for Mobile Chrome. some cases Mobile Chrome will reset
		// focus back to the originating field with the way WebRF
		// handles field navigation instead of letting the browser do it
		//
		event.preventDefault( );
		return false;
	},
	handleSearchResultClick : function( event ) {
		var obj = $( event.target );
		var widget = InforMetaWidget.getWidgetFromJQueryObject( obj );
		if ( widget ) {
			var theName = widget.NAME;
			if ( theName.indexOf( 'Desc' ) !== -1 )
				theName = 'Value' + widget.NAME.substring( 4 );

			var value = currentScreen.getWidgetByName( theName, 'DISPLAY' );
			if ( controller.LKCALLER && value ) {
				var caller = controller.LKCALLER;
				var debugWidget = controller.screens[ caller.screen ].getWidgetByName( caller.field, caller.vector );
				if ( isDebugOn( "LOADDATA" ) )
					console.debug( 'LOADDATA', 'LOOKUP RETURN VALUE', debugWidget.NAME, 'new value', value.getRawValue( ) );
				debugWidget.setValue( value.getRawValue( ) );
				debugWidget.inDisplaySync = true;
				delete controller.LKCALLER;
			}
			controller.prevScreen( InforMetaScreen.EXIT_PREV );
		}
	},

	handleLookup : function( name, vector ) {
		if ( errorOpen || dialogOpen ) {
			return true;
		}

		var evt = null;
		var widget = null;
		if ( typeof name === 'string' ) {
			widget = currentScreen.getWidgetByName( name, vector );
		} else if ( typeof name === 'object' ) {
			evt = name;
			if ( evt.which !== KEYMAP[ appConfig.lookupKey ] )
				return true;
			widget = InforMetaWidget.getWidgetFromJQueryObject( $( this ) );
		}

		if ( !widget )
			return true;

		currentScreen.setResume( false );
		currentScreen.LKUPCALLED = true;
		currentScreen.LASTWIDGET = {
			name : widget.NAME,
			vector : widget.VTYPE
		};
		controller.LKCALLER = {
			screen : currentScreen.screenName,
			field : widget.NAME
		};
		var pIdx = 0, instructs = currentScreen.parsedInstructData, instruct = null, l = instructs.length;

		for ( ; pIdx < l; ++pIdx ) {
			instruct = instructs[ pIdx ];
			if ( instruct.func === 'SETSCREEN' && instruct.screen === widget.LKUP ) {
				currentScreen.createPassedData( instruct, widget.LKUP, false );
			}
		}

		controller.initScreen( widget.LKUP, false, 1 );
	},

	hasVisibleFields : function( ) {
		var send = this.screenFields;
		var idx = 0, l = send.length, fld = null;
		for ( ; idx < l; ++idx ) {
			fld = send[ idx ];
			if ( fld.isVisible( ) ) {
				return true;
			}
		}

		return false;
	},

	hasEditableFields : function( ) {
		var send = this.screenFields;
		var idx = 0, l = send.length, fld = null;
		for ( ; idx < l; ++idx ) {
			fld = send[ idx ];
			if ( fld.WTYPE !== 0 && fld.isVisible( ) && !fld.isReadonly( ) ) {
				return true;
			}
		}

		return false;
	},

	hasItemKeyConfigured : function( ) {
		if ( this.itemKeys.STORERKEY && this.itemKeys.ITEMKEY && this.itemKeys.UOM ) {
			return true;
		}
		return false;
	},

	hasItemKeyData : function( ) {
		if ( this.hasItemKeyConfigured( ) ) {
			if ( this.itemKeys.STORERKEY.getRawValue( ).length > 0 && this.itemKeys.ITEMKEY.getRawValue( ).length > 0 && this.itemKeys.UOM.getRawValue( ).length > 0 ) {
				return true;
			}
		}

		return false;
	},

	handleOptionsKey : function( theKey ) {
		var p = this.getInstructionByKeyStroke( theKey );
		if ( p ) {
			if ( this.EXITONKEY === true )
				this.setExit( true, 'exitonkey' );
			currentScreen.setResume( false );
			currentScreen.closeSelectorDetail( );
			controller.changeScreen( p, false );
			return false;
		}
	},

	hasOptionsKey : function( e ) {
		var theKey = KEYMAP[ e.which ];

		if ( typeof theKey === 'undefined' )
			theKey = String.fromCharCode( e.which );

		if ( theKey === appConfig.aboutKey )
			return true;

		var p = null, idx = 0, inst = this.parsedInstructData, l = inst.length;
		for ( ; idx < l; ++idx ) {
			p = inst[ idx ];
			if ( p.func == 'OPTIONSKEY' && p.key == theKey )
				return true;
		}

		return false;
	},

	hasFunctionKey : function( theKEY ) {
		var p = null, idx = 0, inst = this.parsedInstructData, l = inst.length;
		for ( ; idx < l; ++idx ) {
			p = inst[ idx ];
			if ( p.func == 'KEYSTROKE' && p.key == theKey )
				return true;
		}

		return false;
	},

	moveSelectorRow : function( direction ) {
		var content = selectorDIV.find( '#selectorContent' );
		var state = 1; // something has focus
		var focusCSS = appConfig.columns === 1 ? 'focusCol1' : 'focusCol2';
		var theRow = content.find( '.SCE-Meta-LayoutRow.' + focusCSS );

		if ( theRow.length === 0 ) {
			theRow = content.find( '.SCE-Meta-LayoutRow.selected' );
			if ( theRow.length === 0 )
				state = -1; // no focus or selected
			else
				state = 0; // something is selected
		}

		var newRow = direction === 0 ? theRow.prev( ) : theRow.next( );
		if ( state === -1 ) {
			theRow = content.find( '.SCE-Meta-LayoutRow' ).first( ).addClass( 'selected' );
			scrollToNav( content, theRow );
			$( '#recnum' ).html( parseInt( theRow.attr( 'rname' ) ) + 1 );
		} else if ( state === 0 && newRow.length > 0 && newRow.hasClass( 'SCE-Meta-LayoutRow' ) ) {
			theRow.removeClass( 'selected' ).removeClass( focusCSS );
			newRow.addClass( 'selected' );
			scrollToNav( content, newRow );
			selectorDIV.find( '#recnum' ).html( parseInt( newRow.attr( 'rname' ) ) + 1 );
		} else if ( state === 1 && newRow.length > 0 && newRow.hasClass( 'SCE-Meta-LayoutRow' ) ) {
			theRow.removeClass( 'selected' ).removeClass( focusCSS );
			newRow.addClass( 'selected' ).addClass( focusCSS );
			scrollToNav( content, theRow, function( obj, scrollTop ) {
				currentScreen.copySelectorDataToWidgets( obj );
				currentScreen.addSelectorFocusWidgets( selectorDIV.find( '#selectorDetail' ) );
			}, newRow );
			selectorDIV.find( '#recnum' ).html( parseInt( newRow.attr( 'rname' ) ) + 1 );
		}
	},

	closeSelectorDetail : function( ) {
		var content = selectorDIV.find( '#selectorContent' );
		var focusCSS = appConfig.columns === 1 ? 'focusCol1' : 'focusCol2';
		var theRow = content.find( '.SCE-Meta-LayoutRow.' + focusCSS );
		theRow.removeClass( focusCSS );
		$( '#selectorDetail' ).html( '' ).hide( ).zIndex( -1 );
		$( '#closeSelectorDetail' ).disable( );
		$( '#nextScreenButton' ).disable( );
	},

	showSelectorDetail : function( ) {
		$( '#selectorDetail' ).show( ).zIndex( 99999 );
		$( '#closeSelectorDetail' ).enable( );
		$( '#nextScreenButton' ).enable( );
	},

	inforHandleKeyPressSelector : function( e ) {
		var content = selectorDIV.find( '#selectorContent' );
		var state = 1; // something has focus
		var focusCSS = appConfig.columns === 1 ? 'focusCol1' : 'focusCol2';
		var theRow = content.find( '.SCE-Meta-LayoutRow.' + focusCSS );

		if ( theRow.length == 0 ) {
			theRow = content.find( '.SCE-Meta-LayoutRow.selected' );
			if ( theRow.length == 0 )
				state = -1; // no focus or selected
			else
				state = 0; // something is selected
		}

		//
		// state doesn't matter for the about screen or messaging
		//
		if ( e.which === KEYMAP[ appConfig.aboutKey ] || ( e.which === KEYMAP[ appConfig.msgKey ] && !currentScreen.hasFunctionKey( appConfig.msgKey ) ) ) {
			controller.handleFKeyPress( e.which );
			e.preventDefault( );
			return false;
		}

		if ( state != 1 && this.hasFKEYS && e.which >= KEYMAP[ 'F2' ] && e.which <= KEYMAP[ 'F24' ] ) {
			displayPageError( SCElocalize( "Error_DetailViewNotActive" ), null );
			e.preventDefault( );
			return false;
		} else if ( state == -1 ) {
			if ( isDebugOn( "SCREENFLOW" ) )
				console.debug( 'SCREENFLOW', currentScreen.screenName, 'selector screen no row has focus/selected' );
			switch ( e.which ) {
				case KEYMAP[ 'escape' ] : {
					this.closeSelectorDetail( );
					controller.prevScreen( InforMetaScreen.EXIT_CANCEL );
					return false;
					break;
				}
				case KEYMAP[ 'tab' ] :
				case KEYMAP[ 'left' ] :
				case KEYMAP[ 'up' ] :
				case KEYMAP[ 'right' ] :
				case KEYMAP[ 'down' ] :
				case KEYMAP[ 'KEY2' ] :
				case KEYMAP[ 'KEY4' ] :
				case KEYMAP[ 'KEY6' ] :
				case KEYMAP[ 'KEY8' ] :
				case KEYMAP[ 'NUM2' ] :
				case KEYMAP[ 'NUM4' ] :
				case KEYMAP[ 'NUM6' ] :
				case KEYMAP[ 'NUM8' ] : {
					this.selectFirstSelectorRow( content );
					e.preventDefault( );
					return false;
					break;
				}
			}
		} else if ( state === 0 ) {
			if ( isDebugOn( "SCREENFLOW" ) )
				console.debug( 'SCREENFLOW', this.screenName, 'selector screen row is selected' );
			switch ( e.which ) {
				case KEYMAP[ 'escape' ] : {
					this.closeSelectorDetail( );
					controller.prevScreen( InforMetaScreen.EXIT_CANCEL );
					return false;
					break;
				}
				case KEYMAP[ 'enter' ] : {
					theRow.addClass( focusCSS );
					this.copySelectorDataToWidgets( theRow );
					this.addSelectorFocusWidgets( selectorDIV.find( '#selectorDetail' ) );
					this.showSelectorDetail( );
					break;
				}
				case KEYMAP[ 'left' ] :
				case KEYMAP[ 'up' ] :
				case KEYMAP[ 'KEY4' ] :
				case KEYMAP[ 'KEY8' ] :
				case KEYMAP[ 'NUM4' ] :
				case KEYMAP[ 'NUM8' ] : {
					this.moveSelectorRow( 0 );
					e.preventDefault( );
					return false;
					break;
				}
				case KEYMAP[ 'tab' ] :
				case KEYMAP[ 'right' ] :
				case KEYMAP[ 'down' ] :
				case KEYMAP[ 'KEY2' ] :
				case KEYMAP[ 'KEY6' ] :
				case KEYMAP[ 'NUM2' ] :
				case KEYMAP[ 'NUM6' ] : {
					this.moveSelectorRow( 1 );
					e.preventDefault( );
					return false;
					break;
				}
			}
		} else { // something has focus
			if ( isDebugOn( "SCREENFLOW" ) )
				console.debug( 'SCREENFLOW', this.screenName, 'selector screen row has focus' );

			if ( this.hasOptionsKey( e ) ) {
				var theKey = KEYMAP[ e.which ];
				if ( typeof theKey === 'undefined' )
					theKey = String.fromCharCode( e.which );

				if ( typeof theKey !== 'undefined' ) {
					var p = this.getInstructionByKeyStroke( theKey );
					if ( p ) {
						if ( this.EXITONKEY == true )
							this.setExit( true, 'exitonkey' );
						currentScreen.setResume( false );
						currentScreen.closeSelectorDetail( );
						controller.changeScreen( p, false );
						return false;
					}
				}
			}
			if ( ( this.hasFKEYS && e.which >= KEYMAP[ 'F2' ] && e.which <= KEYMAP[ 'F24' ] ) || ( e.which === KEYMAP[ appConfig.itemKey ] && this.hasItemKeyConfigured( ) ) ) {
				// F1 through F12 function keys can exist on all screens
				controller.handleFKeyPress( e.which );
				e.preventDefault( );
				return false;
			} else if ( e.which === KEYMAP[ 'enter' ] ) { // enter pressed.
				var done = this.determineNextStep( 'ONENTER' );
				if ( done ) {
					if ( this.DELETEONENTER ) {
						var idx = parseInt( theRow.attr( "rname" ) );
						theRow.remove( );
						if ( typeof idx === 'number' ) {
							this.selectorData.splice( idx, 1 );
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
							console.debug( screenDebug( 'SCREENFLOW', this, 'special lookup using selector go back to caller scenario.', '' ) );
						this.saveData( done );
						this.setExit( true, 'exitonenter' );
						this.closeSelectorDetail( );
						controller.prevScreen( InforMetaScreen.EXIT_PREV );

						return false;
					} else {
						if ( this.EXITONENTER )
							this.setExit( true, 'exitonenter' );

						this.closeSelectorDetail( );
						controller.changeScreen( done, false );
						return false;
					}
				}

				done = this.determineNextStep( 'ERROR', 1 );
				if ( done ) {
					if ( done.func == 'ERRORYESNO' ) {
						this.displayYesNoDialog( done );
					} else if ( done.func == 'ERROR' ) {
						if ( this.EXITONERROR )
							this.setExit( true, 'exitonerror' );
						controller.changeScreen( done, false );
					} else if ( done.func == 'ERRORWARNING' ) {
						displayPageError( this.translate( done.msg ), function( ) {
							controller.clearInProcess( );
						} );
					}
					this.closeSelectorDetail( );
					return false;
				}
			}

			switch ( e.which ) {
				case KEYMAP[ 'escape' ] : {
					this.closeSelectorDetail( );
					break;
				}

				case KEYMAP[ 'left' ] :
				case KEYMAP[ 'KEY4' ] :
				case KEYMAP[ 'NUM4' ] : {
					this.moveSelectorRow( 0 );
					e.preventDefault( );
					return false;
					break;
				}
				case KEYMAP[ 'tab' ] :
				case KEYMAP[ 'right' ] :
				case KEYMAP[ 'KEY6' ] :
				case KEYMAP[ 'NUM6' ] : {
					this.moveSelectorRow( 1 );
					e.preventDefault( );
					return false;
					break;
				}
			}
		}
		return true;
	},

	inforHandleClickSelector : function( event ) {
		var theRow = $( event.target );
		if ( theRow.hasClass( 'SCE-Meta-LayoutRowCell' ) ) {
			// cell in the row clicked. get the parent which is theRow
			theRow = theRow.parent( );
		}

		var focusCSS = appConfig.columns === 1 ? 'focusCol1' : 'focusCol2';
		var content = selectorDIV.find( '#selectorContent' );
		var currentRow = content.find( '.SCE-Meta-LayoutRow.' + focusCSS );
		if ( currentRow.length == 0 ) {
			currentRow = content.find( '.SCE-Meta-LayoutRow.selected' );
			if ( currentRow.length == 0 )
				currentRow = null;
		}

		if ( currentRow ) {
			currentRow.removeClass( focusCSS ).removeClass( 'selected' );
		}

		theRow.addClass( 'selected' ).addClass( focusCSS );
		currentScreen.copySelectorDataToWidgets( theRow );
		currentScreen.addSelectorFocusWidgets( selectorDIV.find( '#selectorDetail' ) );
		selectorDIV.find( '#recnum' ).html( parseInt( theRow.attr( 'rname' ) ) + 1 );
		currentScreen.showSelectorDetail( );
		event.preventDefault( );
		return false;
	},

	inforHandleKeyPressSearchResult : function( e ) {
		switch ( e.which ) {
			case KEYMAP[ 'enter' ] : {
				var temp = layoutDIV.find( ':focus' );
				var widget = InforMetaWidget.getWidgetFromJQueryObject( temp );
				if ( widget ) {
					var theName = widget.NAME;
					if ( theName.indexOf( 'Desc' ) !== -1 )
						theName = 'Value' + widget.NAME.substring( 4 );
					var value = currentScreen.getWidgetByName( theName, 'DISPLAY' );
					if ( controller.LKCALLER && value ) {
						var caller = controller.LKCALLER;
						var debugWidget = controller.screens[ caller.screen ].getWidgetByName( caller.field, caller.vector );
						if ( isDebugOn( "LOADDATA" ) )
							console.debug( 'LOADDATA', 'LOOKUP RETURN VALUE', debugWidget.NAME, 'new value', value.getRawValue( ) );
						debugWidget.setValue( value.getRawValue( ) );
						debugWidget.inDisplaySync = true;
						delete controller.LKCALLER;
					}
					controller.prevScreen( InforMetaScreen.EXIT_PREV );
				}
				break;
			}
			case KEYMAP[ 'escape' ] : {
				controller.prevScreen( InforMetaScreen.EXIT_CANCEL );
				break;
			}
			case KEYMAP[ 'tab' ] : {
				var status = nextField( e.shiftKey );
				if ( status > 0 ) {
					// moved somewhere up or down
					if ( e.shiftKey && currentScreen.searchResultIndex > 0 ) {
						currentScreen.searchResultIndex -= 1;
						currentScreen.copySearchResultDataToWidget( );
						currentScreen.buildScreen( false, false, false, false );
					} else if ( this.searchResultIndex < currentScreen.searchResultData.length - 1 ) {
						currentScreen.searchResultIndex += 1;
						currentScreen.copySearchResultDataToWidget( );
						currentScreen.buildScreen( false, false, false, false );
					} else {
						currentScreen.setFirstFieldFocus( ); // loop back to the top
					}
				}
				break;
			}
			case KEYMAP[ 'left' ] :
			case KEYMAP[ 'up' ] :
			case KEYMAP[ 'KEY4' ] :
			case KEYMAP[ 'KEY8' ] :
			case KEYMAP[ 'NUM4' ] :
			case KEYMAP[ 'NUM8' ] : {
				var status = nextField( true );
				if ( status > 0 ) {
					// moved up a field
					if ( currentScreen.searchResultIndex > 0 ) {
						currentScreen.searchResultIndex -= 1;
						currentScreen.copySearchResultDataToWidget( );
						currentScreen.buildScreen( false, false, false, false );
						currentScreen.setFirstFieldFocus( ); // loop back to the top
					}
				}
				break;

			}
			case KEYMAP[ 'right' ] :
			case KEYMAP[ 'down' ] :
			case KEYMAP[ 'KEY2' ] :
			case KEYMAP[ 'KEY6' ] :
			case KEYMAP[ 'NUM2' ] :
			case KEYMAP[ 'NUM6' ] : {
				var status = nextField( false );
				if ( currentScreen.searchResultData && status > 0 ) {
					// moved down a field
					if ( currentScreen.searchResultIndex < currentScreen.searchResultData.length - 1 ) {
						currentScreen.searchResultIndex += 1;
						currentScreen.copySearchResultDataToWidget( );
						currentScreen.buildScreen( false, false, false, false );
						currentScreen.setFirstFieldFocus( ); // loop back to the top
					}
				}
				break;

			}
		}
		currentScreen.setSearchResultNavButtons( );
		e.preventDefault( );
		return false;
	},

	inforHandleKeyPressMENU : function( e ) {
		if ( ( e.which >= KEYMAP[ 'KEY0' ] && e.which <= KEYMAP[ 'KEY9' ] ) || ( e.which >= KEYMAP[ 'NUM0' ] && e.which <= KEYMAP[ 'NUM9' ] ) ) {
			e.preventDefault( );
			controller.inforHandleKeyPress( e.which );
			return false;
		} else if ( e.which == KEYMAP[ 'escape' ] ) {
			e.preventDefault( );
			currentScreen.state.CANCEL = -1;
			controller.prevScreen( InforMetaScreen.EXIT_CANCEL );
			return false;
		} else if ( KEYMAP[ e.which ] == appConfig.msgKey || KEYMAP[ e.which ] == appConfig.navHomeKey ) {
			if ( controller.handleFKeyPress( e.which ) ) {
				// we used the key, stop handling it.
				e.preventDefault( );
				return false;
			}
		} else if ( e.which >= KEYMAP[ 'F1' ] && e.which <= KEYMAP[ 'F24' ] ) {
			// prevent function keys going to the browser
			e.preventDefault( );
			return false;
		}

		return true;
	},

	inforHandleKeyPress : function( e ) {
		if ( inFieldGroupCheck ) {
			return false;
		} else if ( this.SEARCHRESULT ) {
			return this.inforHandleKeyPressSearchResult( e );
		} else if ( this.SELECTOR ) {
			return this.inforHandleKeyPressSelector( e );
		} else if ( this.MENU ) {
			return this.inforHandleKeyPressMENU( e );
		} else if ( e.which == KEYMAP[ 'escape' ] ) { // esc key
			// all screens exit on ESCAPE.
			currentScreen.state.CANCEL = -1;
			controller.prevScreen( InforMetaScreen.EXIT_CANCEL );
			return false;
		} else if ( e.which >= KEYMAP[ 'F1' ] && e.which <= KEYMAP[ 'F24' ] ) {
			// F1 through F12 function keys can exist on all screens
			controller.handleFKeyPress( e.which );
			return false;
		} else if ( this.hasOptionsKey( e ) && !currentScreen.hasEditableFields( ) ) {
			var theKey = KEYMAP[ e.which ];
			if ( typeof theKey === 'undefined' )
				theKey = String.fromCharCode( e.which );

			if ( typeof theKey !== 'undefined' ) {
				var p = this.getInstructionByKeyStroke( theKey );
				if ( p ) {
					if ( this.EXITONKEY == true )
						this.setExit( true, 'exitonkey' );
					this.setResume( false );
					controller.changeScreen( p, false );
					return false;
				}
			}
		} else if ( e.which == KEYMAP[ 'enter' ] || e.which == KEYMAP[ 'tab' ] ) {
			// getting this far means just a regular old screen here.
			var focused = $( ':focus' );
			var cwidget = InforMetaWidget.getWidgetFromJQueryObject( focused );
			var hval = focused.val( );
			var status = nextField( e.shiftKey );
			if ( status > 0 ) {
				// handleBlur won't trigger when we're on the last field in the form since we don't
				// focus out of the last field. So run the blur validation logic here.
				var id = !this.NOBRCDPARSE && appConfig.barCode ? appConfig.barCode.exists( hval ) : null;
				if ( id ) {
					currentScreen.handleBarCode( id, hval, cwidget, function( ) {
						if ( currentScreen ) {
							if ( currentScreen.VALIDATEINPUT && currentScreen.lastField && focused.attr( 'id' ) != currentScreen.lastField.ID ) {
								// this is not the last field in the list for this VALIDATEINPUT screen.
								// bump up the displayed rows to the next editable field and redisplay
								currentScreen.validateRow = currentScreen.findNextValidateField( );
								var maxRowsPerPage = currentScreen.calculateMaxRowsPerPage( );
								var maxRow = ( maxRowsPerPage * currentScreen.currPage ); // 0 based rows
								console.error( 'after barcode', currentScreen.validateRow, maxRow, maxRowsPerPage );
								if ( currentScreen.validateRow <= maxRow ) {
									currentScreen.buildScreen( true, false, false, true );
									return false;
								}
							}

							currentScreen.enableScreen( );
							currentScreen.nextScreenCheck( status );
						} else {
							acceptDialog.inforOpen( );
						}
					} );

					return false;
				} else if ( cwidget && cwidget.WTYPE === WIDGET_DATE && hval.length > 0 ) {
					// dates can get out of sync as they won't have a valid internal
					// date until the entire date is entered.
					cwidget.setValue( hval );
					if ( cwidget.getRawValue( ).length <= 0 ) {
						focused.val( '' );
						cwidget.setValue( '' );
						displayPageError( SCElocalize( "Error_InvalidDateInField", cwidget.NAME ), function( ) {
							focused.focus( );
						} );
						return false;
					}
				} else if ( cwidget && !cwidget.validateContents( ) ) {
					focused.val( '' );
					cwidget.setValue( '' );
					displayPageError( SCElocalize( "Error_InvalidDataInField", cwidget.NAME ), function( ) {
						focused.focus( );
					} );
					return false;
				}

				if ( this.VALIDATEINPUT && this.lastField && focused.attr( 'id' ) != this.lastField.ID ) {
					// this is not the last field in the list for this VALIDATEINPUT screen.
					// bump up the displayed rows to the next editable field and redisplay
					this.validateRow = this.findNextValidateField( );
					if ( cwidget )
						cwidget.inDisplaySync = true;

					var maxRowsPerPage = this.calculateMaxRowsPerPage( );
					var maxRow = ( maxRowsPerPage * this.currPage ); // 0 based rows
					if ( this.validateRow <= maxRow ) {
						this.buildScreen( true, false, false, true );
						return false;
					}
				}

				if ( currentScreen ) {
					currentScreen.nextScreenCheck( status );
				} else {
					acceptDialog.inforOpen( );
				}
			} else {
				// moved to the next field.
				controller.clearInProcess( );
			}
			return false;
		}
		return true;
	},

	nextScreenCheck : function( status ) {
		if ( this.DISPLAYONLY || !this.hasEditableFields( ) || this.AUTOENTER || ( this.maxPage > 1 && this.currPage < this.maxPage ) ) {
			controller.nextScreen( InforMetaScreen.EXIT_NEXT, status );
		} else {
			acceptDialog.inforOpen( );
		}

	},

	resumeProcessing : function( xmitReturn ) {
		try {
			if ( isDebugOn( "SCREENFLOW" ) )
				console.debug( screenDebug( 'SCREENFLOW', this, 'resumeProcessing', 'exitScreen[' + this.getExit( ) + '] resume[' + this.resume + '] xmitonly[' + this.XMITONLY + '] xmitDone[' + this.xmitDone + '] controller error [' + controller.getError( ) + ']' ) );

			if ( !this.MENU && this.resume && this.getExit( ) && ( ( !this.XMITONLY && controller.getError( ) == null ) || this.XMITONLY ) ) {
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( 'SCREENFLOW', this.screenName, 'exit resumeProc screen flagged as exit and we are resume processing', 'RECTYPE?', this.getWidgetByName( 'rectype', 'RECEIVE', false ), 'this xmitReturn', this.state.ERRORCODE, 'this msg', this.xmitMessage );
				controller.prevScreen( InforMetaScreen.EXIT_PREV );
				return;
			}

			if ( this.SELECTOR && this.resume ) {
				this.setRecordNumber( this.currREC );
				this.setRecordTotal( this.selectorData.length );
				if ( this.selectorData.length === 0 ) {
					controller.prevScreen( InforMetaScreen.EXIT_PREV );
					return;
				}
			} else {
				this.setRecordNumber( 1 );
			}

			if ( !this.resume ) {
				this.resetState( );

				var fields = this.screenFields;
				var fieldsLength = fields.length;
				var widget = null;

				// this needs to be here and not later in the workflow
				for ( var idx = 0; idx < fieldsLength; ++idx ) {
					widget = fields[ idx ];
					if ( widget.WTYPE != WIDGET_LABEL && widget.EDITSTATE === 3 ) { // force blank
						widget.setValue( widget.DVALUE );
					}
				}
			}

			footerDIV.hide( ); // always, for now.

			// see if any other screens tried to pass us data.
			this.loadData( );

			if ( this.xmitDone && xmitReturn ) {
				this.state.ERRORCODE = this.getErrorCodeReturned( this.state.ERRORCODE );
				this.xmitMessage = this.getMessage( this.xmitMessage );
			}

			if ( this.XMITONLY ) {
				// when xmitReturn is false, means we are still executing logic
				// from before the XMIT is actually made.
				if ( !this.xmitDone ) {
					var done = this.determineNextStep( 'SENDIF' );
					if ( done ) {
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( screenDebug( 'SCREENFLOW', this, 'SENDIF', done.full ) );
						controller.changeScreen( done, false );
						return;
					}

					// if we get to this point, this XMITONLY should XMIT to the server
					// we need to be able to sort through ERROR instructions
					// against AFTER the XMIT comes back so reset the state of it.
					this.state[ 'ERROR' ] = -1;
					this.xmitDone = true;
					ws.sendMessage( this.procName, buildSendString( this.procName, this.appFlag ), null, null, false );
					return;
				} else {
					//
					// only display the message IF this is the resume directly after the
					// PROCEDURE call. Otherwise we can get duplicate displays of the error
					//
					if ( this.state.ERRORCODE == 9 && xmitReturn === true )
						displayPageError( this.xmitMessage );

					done = this.determineNextStep( 'DISPLAYMESSAGE', this.state.DISPLAYMESSAGE );
					if ( done ) {
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( 'SCREENFLOW', this.screenName, 'new Screen', 'execute a DISPLAYMESSAGE command', done.func );
						this.displayYesNoDialog( done );
						return;
					}
					if ( isDebugOn( "SCREENFLOW" ) )
						console.debug( 'SCREENFLOW', this.screenName, 'no more DISPLAYMESSAGE to process' );

					var done = this.determineNextStep( 'IFRECEIVE' );
					if ( done ) {
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( screenDebug( 'SCREENFLOW', this, 'IFRECEIVE', done.full ) );
						controller.changeScreen( done, false );
						return;
					}

					done = this.determineNextStep( 'ERROR', this.state.ERRORCODE );
					if ( done ) {
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( screenDebug( 'SCREENFLOW', this, 'ERROR', done.full ) );
						if ( done.func == 'ERRORYESNO' ) {
							this.displayYesNoDialog( done );
						} else if ( done.func == 'ERROR' ) {
							if ( this.EXITONERROR )
								this.setExit( true, 'exitonerror' );
							controller.changeScreen( done, false );
						} else if ( done.func == 'ERRORWARNING' ) {
							if ( isDebugOn( "SCREENFLOW" ) )
								console.debug( screenDebug( 'SCREENFLOW', this, 'ERRORWARNING', done.full ) );
							controller.clearInProcess( );
							displayPageError( this.translate( done.msg ), function( ) {
								controller.setInProcess( );
								controller.prevScreen( InforMetaScreen.EXIT_ERROR );
							}, true );
						}
						return;
					}

					// LL1 labor login
					// SND000 serial number notification
					// M1 start of main menu process, leads to M2
					if ( this.screenName == 'LL1' && typeof this.LL1DONE === 'undefined' ) {
						this.LL1DONE = 'done';
						controller.initScreen( 'SND00', false, 1 );
						return;
					} else if ( this.screenName == 'SND00' && typeof this.SND00DONE === 'undefined' ) {
						this.SND00DONE = 'done';
						controller.initScreen( 'M1', false, 1 );
						return;
					} else {
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( screenDebug( 'SCREENFLOW', this, 'XMITONLY screen out of things to do, return to caller screen' ) );
						controller.prevScreen( InforMetaScreen.EXIT_PREV );
						return;
					}
				}
			} else { // is not XMITONLY
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( screenDebug( 'SCREENFLOW', this, 'xmitReturnCode(not XMITONLY)', this.state.ERRORCODE ) );
				var doNotExit = false;
				if ( this.screenName != 'L1' && !this.LKUPCALLED ) {
					if ( xmitReturn && this.state.ERRORCODE == 9 ) {
						displayPageError( this.xmitMessage );
						doNotExit = true;
					}

					if ( this.resume && controller.getError( ) != null ) {
						controller.clearError( );
						// don't exit if something we called errored out.
						this.setExit( false, 'no exit on error' );
					}

					// if there isn't anything the user can do on this screen
					// just process instructions and move on.
					var stayOnScreen = this.stayOnScreen( );
					if ( isDebugOn( "SCREENFLOW" ) )
						console.debug( screenDebug( 'SCREENFLOW', this, 'do we display this screen?', 'stayOnScreen?[' + stayOnScreen + '] resumeProc[' + this.getResume( ) + ']' ) );

					if ( !this.SELECTOR && !this.MENU && ( ( this.resume && this.getResume( ) && this.state.CANCEL === -1 ) || !stayOnScreen ) ) {
						var done = this.determineNextStep( 'SENDIF' );
						if ( done ) {
							if ( isDebugOn( "SCREENFLOW" ) )
								console.debug( 'SCREENFLOW', this.screenName, 'new Screen', 'execute a SENDIF command', done );
							controller.changeScreen( done, false );
							return;
						}
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( 'SCREENFLOW', this.screenName, 'no more SENDIF to process' );

						if ( !this.xmitDone && !this.NOXMIT ) {
							this.xmitDone = true;
							ws.sendMessage( this.procName, buildSendString( this.procName, this.appFlag ), null, null, false );
							return;
						} else if ( this.NOXMIT ) {
							this.state.ERRORCODE = 1;
						}

						done = this.determineNextStep( 'DISPLAYMESSAGE', this.state.DISPLAYMESSAGE );
						if ( done ) {
							if ( isDebugOn( "SCREENFLOW" ) )
								console.debug( 'SCREENFLOW', this.screenName, 'new Screen', 'execute a DISPLAYMESSAGE command', done.func );
							this.displayYesNoDialog( done );
							return;
						}
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( 'SCREENFLOW', this.screenName, 'no more DISPLAYMESSAGE to process' );

						if ( this.xmitDone || this.NOXMIT ) {
							done = this.determineNextStep( 'IFRECEIVE' );
							if ( done ) {
								if ( isDebugOn( "SCREENFLOW" ) )
									console.debug( 'SCREENFLOW', this.screenName, 'new Screen', 'execute a IFRECEIVE command', done );
								controller.changeScreen( done, false );
								return;
							}
						}
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( 'SCREENFLOW', this.screenName, 'no more IFRECEIVE to process' );

						done = this.determineNextStep( 'ERROR', this.state.ERRORCODE );
						if ( done ) {
							if ( isDebugOn( "SCREENFLOW" ) )
								console.debug( 'SCREENFLOW', this.screenName, 'new Screen', 'execute a ERROR command', done.func );
							if ( done.func == 'ERRORYESNO' ) {
								this.displayYesNoDialog( done );
								return;
							} else if ( done.func == 'ERROR' ) {
								if ( this.EXITONERROR )
									this.setExit( true, 'exitonerror' );
								controller.changeScreen( done, false );
								return;
							} else if ( done.func == 'ERRORWARNING' ) {
								displayPageError( this.translate( done.msg ) );
								if ( this.EXITONERROR )
									this.setExit( true, 'exitonerror' );
							}
						}
						if ( isDebugOn( "SCREENFLOW" ) )
							console.debug( 'SCREENFLOW', this.screenName, 'no more ERROR to process' );

						if ( !doNotExit ) {
							var cNumTimes = this.getCurrNumTimes( );
							var numTimes = this.getNumTimes( );
							cNumTimes += 1;
							this.setCurrNumTimes( cNumTimes );
							if ( this.getExit( ) || ( numTimes != -1 && cNumTimes > numTimes ) ) {
								if ( isDebugOn( "SCREENFLOW" ) )
									console.debug( 'SCREENFLOW', 'trigger prev Screen', 'screen flagged as exit OR numtimes exceeded', this.screenName, 'menu? here?', this.MENU, 'exitScreen', this.getExit( ), 'numTimes', numTimes, 'currtNumTimes', cNumTimes );
								controller.prevScreen( InforMetaScreen.EXIT_PREV );
								return;
							}

							// everything is done with this screen, we are staying
							// on this screen. Reset the screen as a new screen.
							this.resetScreenInfo( false );
							if ( isDebugOn( "SCREENFLOW" ) )
								console.debug( screenDebug( 'SCREENFLOW', this, 'stay on this screen?', 'numTimes:' + this.getNumTimes( ) ) );
							if ( this.getNumTimes( ) > 1 && !stayOnScreen ) {
								// stayOnScreen is false if there are no visible widgets for the screen. This is a
								// special case where there is a screen with nothing visible AND it has a
								// numtimes other than 1. We don't want to display a blank screen here.
								console.debug( this.screenName, 'special resume case' );
								return this.resumeProcessing( false );
							}
						}
					}
				}
				if ( !this.resume && this.DD.length > 0 ) {
					this.handleDynamicDefault( function( ) {
						currentScreen.buildScreen( false, true, true, false );

						if ( currentScreen.SELECTOR )
							currentScreen.disableScreen( false );
					} );
				} else {
					var fieldReset = !this.getKeyStroke( ) && !this.LKUPCALLED;

					if ( this.SELECTOR ) {
						this.setResume( false );
						this.resetState( );
						this.buildScreen( false, true, fieldReset, false );
						selectorDIV.find( '#rectot' ).html( this.selectorData.length );
						selectorDIV.find( '#recnum' ).html( 1 );
						this.disableScreen( false );
						$( '#prevScreenButton' ).enable( );
					} else {
						this.setResume( true );
						this.buildScreen( false, true, fieldReset, this.VALIDATEINPUT && this.LKUPCALLED );
					}
				}
				if ( this.LKUPCALLED ) {
					this.LKUPCALLED = false;
				}
				if ( this.getKeyStroke( ) )
					this.setKeyStroke( false );

				if ( this.LASTWIDGET ) {
					var lw = this.getWidgetByName( this.LASTWIDGET.name, this.LASTWIDGET.vector, false );
					if ( lw ) {
						lw.focus( !FIRE_FG_HANDLER );
					}
					delete this.LASTWIDGET;
				}

				return;
			}
		} finally {

		}
	},
	determineNextStep : function( funcName, errorCode ) {
		var pIdx = 0;

		// when resuming, pull the state to see the last index we processed for
		// this function name.
		// otherwise start back over at zero.
		if ( this.resume )
			pIdx = ++this.state[ funcName ];

		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( screenDebug( 'SCREENFLOW', this, 'find next step for [' + funcName + '] erroCode:[' + errorCode + ']', pIdx ) );

		var instructions = this.parsedInstructData;
		var p;
		for ( var l = instructions.length; pIdx < l; ++pIdx ) {
			this.state[ funcName ] = pIdx;
			p = instructions[ pIdx ];
			if ( p.func != funcName && ! ( funcName == 'ERROR' && ( p.func == 'ERRORYESNO' || p.func == 'ERRORWARNING' ) ) )
				continue;

			if ( p.errorCode == errorCode && ( ( funcName == 'CANCEL' && funcName == p.func ) || ( funcName = 'ERROR' && ( p.func == 'ERRORYESNO' || p.func == 'ERROR' || p.func == 'ERRORWARNING' ) ) ) ) {
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( 'SCREENFLOW', this.screenName, 'returning CANCEL or ERROR command', p.func );
				return p;
			} else if ( p.evaluate( this.fieldData ) ) {
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( 'SCREENFLOW', this.screenName, 'evaluated true', p.full );
				return p;
			}
		}

		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( 'SCREENFLOW', this.screenName, 'NO next step', funcName, errorCode );
		return null;
	},
	loadScreenDataSuccess : function( data ) {
		try {
			if ( data && !this.loadScreenData( data ) )
				return;

			this.resumeProcessing( false );
		} catch ( err ) {
			console.error( err, err.stack );
			displayPageError( ( err.message ? err.message : err ), function( ) {
				exitScreen( 1000 );
			} );
			this.disableScreen( false );
		}
	},
	fitsInColumnOnPage : function( widget, rowsPerColumn, minRow, maxRow ) {
		var col = -1, colIdx = 0, colLength = ( this.MENU ? 1 : appConfig.columns );

		for ( colIdx = 0; colIdx < colLength; ++colIdx ) {
			var adj = rowsPerColumn * colIdx;

			if ( ( widget.VPOS >= ( minRow + adj ) ) && ( widget.VPOS <= ( maxRow + adj ) ) ) {
				col = colIdx;
				break;
			}
		}

		return col;
	},
	copySearchResultDataToWidget : function( ) {
		//
		// data will end up with 15 items in the array. IGNORE the first item
		// always
		//
		var data = this.searchResultData[ this.searchResultIndex ].split( parmDelimiter );
		var idx = 1, l = 7, widget = null;
		for ( ; idx <= l; ++idx ) {
			widget = this.getWidgetByName( 'Value' + ( idx ) );
			if ( widget ) {
				widget.setValue( data[ idx ] );
			}
			widget = this.getWidgetByName( 'Desc' + ( idx ) );
			if ( widget ) {
				widget.setValue( data[ idx + l ] );
			}
		}
	},
	copySelectorDataToWidgets : function( theRow ) {
		var idx = theRow.attr( "rname" );
		idx = parseInt( idx );
		if ( typeof idx === 'number' ) {
			var rowData = this.selectorData[ idx ];
			if ( typeof rowData === 'object' ) {
				var fidx = 0, flds = this.fieldData, fieldCount = flds.length, widget = null, row = null;

				for ( ; fidx < fieldCount; ++fidx ) {
					widget = flds[ fidx ];
					row = rowData[ widget.VTYPE + '_' + widget.NAME ];
					if ( typeof row === 'string' ) {
						widget.setValue( row );
					}

				}
			}
		}
	},
	showFunctionKeyButtons : function( ) {
		$( "#specialKeysTablet" ).show( );
		$( '#fkeySlotDIV' ).html( '' );

		if ( this.hasLookupField )
			$( "#fkeySlotDIV" ).append( '<button id="lookupButton" type="button" disabled class="inforFormButton SCE-Meta-FunctionKeyButton" >' + appConfig.lookupKey + '</button>' );

		var instructions = this.parsedInstructData;
		// this outer loop is to make sure the KEYS get put in order in the list

		var kIdx, l, theKey, pIdx, p;
		var pLength = instructions.length;

		for ( kIdx = 0, l = KEYS.length; kIdx < l; ++kIdx ) {
			theKey = KEYS[ kIdx ].key;

			for ( pIdx = 0; pIdx < pLength; ++pIdx ) {
				p = instructions[ pIdx ];
				if ( p.func == 'KEYSTROKE' && p.key == theKey ) {
					$( "#fkeySlotDIV" ).append( '<button id="' + p.key + '" type="button" class="inforFormButton SCE-Meta-FunctionKeyButton" onClick="controller.specialButtonPress(\'' + p.key + '\')">' + p.key + '</button>' );
					break;
				}
			}
		}

		if ( appConfig.isTablet && this.hasItemKeyConfigured( ) ) {
			var disabled = this.hasItemKeyData( ) ? '' : 'disabled';
			$( "#fkeySlotDIV" ).append( '<button id="itemIMGButton" type="button" ' + disabled + ' class="inforFormButton SCE-Meta-FunctionKeyButton" onclick="currentScreen.displayItemImageScreen()" >' + appConfig.itemKey + '</button>' );
		}

		if ( this.SEARCHRESULT ) {
			$( "#fkeySlotDIV" ).append( '<button id="SRDOWN" class="inforIconButton down" style="margin: 5px;" onclick="controller.searchResultNav(\'down\');"><span></span></button>' ).append( '<button id="SRUP" class="inforIconButton up" style="margin: 5px;" onclick="controller.searchResultNav(\'up\');"><span></span></button>' );
			this.setSearchResultNavButtons( );
		}

		$( '#screenCodeDIV' ).html( '' ).append( currentScreen.screenName ).show( );
	},

	setFirstFieldFocus : function( ) {
		if ( isDebugOn( 'WIDGET' ) )
			console.debug( screenDebug( 'WIDGET', this, 'setFirstFieldFocus', this.firstField ? this.firstField.NAME : 'no first field' ) );
		if ( this.firstField && ( !this.DISPLAYONLY || this.SEARCHRESULT ) && !this.SELECTOR ) {
			this.firstField.focus( !FIRE_FG_HANDLER );
		}
	},
	setTabletKeyEvents : function( ) {
		layoutDIV.find( '.SCE-Meta-LayoutWidget' ).on( 'paste', function( e ) {
			if ( errorOpen || dialogOpen )
				return false;

			var widget = InforMetaWidget.getWidgetFromJQueryObject( $( this ) );

			if ( !widget )
				return true;

			var self = this;
			setTimeout( function( ) {
				// need to wait for the contents to actually be pasted.
				// that hasn't happened yet when paste fires.
				if ( !widget.validateContents( ) ) {
					$( self ).focus( ).validationMessage( "show", "invalid", true );
				}
			}, 100 );
			return true;
		} );
	},
	handleDynamicDefault : function( postHandler ) {
		try {
			var widget, iWidget, key = null, idx = 0, l = 0, send = [ ], inputs = null;

			for ( key in this.DD ) {
				if ( key === 'length' ) {
					continue;
				}

				widget = this.getWidgetByName( key );
				if ( widget && widget.DYNDFLT.length > 0 ) {
					var sendString = 'EXEC ' + widget.DYNDFLT + ' ' + buildXMITHeader( widget.DYNDFLT, this.screenName );
					idx = 0;
					inputs = this.DD[ key ];
					l = inputs.length;
					for ( ; idx < l; ++idx ) {
						iWidget = inputs[ idx ];
						sendString = sendString + addDataParameters( iWidget.widget.getRawValue( ) );
					}

					send.push( {
						widget : widget,
						out : sendString
					} );
				}
			}

			if ( send.length > 0 ) {
				this.handleDynamicDefaultHelper( send, postHandler );
			}
		} catch ( err ) {
			// ignore.
			console.error( err );
		}
	},
	handleDynamicDefaultHelper : function( sendQueue, postHandler ) {
		var widget = sendQueue[ 0 ].widget;
		ws.sendMessage( widget.DYNDFLT, sendQueue[ 0 ].out, function( data, callbackData ) {
			var fields = data.split( parmDelimiter );

			// field 9 is the default value for the trigger widget
			if ( typeof fields[ 9 ] !== 'undefined' )
				callbackData[ 0 ].widget.setValue( fields[ 9 ] );

			if ( callbackData.length > 1 ) {
				callbackData = callbackData.slice( 1 );
				currentScreen.handleDynamicDefaultHelper( callbackData, postHandler );
			} else {
				if ( typeof postHandler === 'function' ) {
					postHandler( );
				}
			}
		}, sendQueue, false );
	},
	handleFGChange : function( nextWidget ) {
		this.disableScreen( );
		if ( isDebugOn( 'FGS' ) )
			console.debug( screenDebug( 'FGS', this, 'FG triggered', 'FG:[' + this.currentFieldGroup + '] nextWidget:[' + ( nextWidget ? nextWidget.NAME : 'NULL' ) + ']' ) );
		var PROC = null;
		var fgObj = this.FGS[ this.currentFieldGroup ];
		if ( typeof fgObj === 'undefined' || typeof fgObj.inputs === 'undefined' ) {
			if ( isDebugOn( 'FGS' ) )
				console.error( screenDebug( 'FGS', this, 'missing field group information', this.currentFieldGroup ) );
			displayPageError( SCElocalize( 'Error_InvalidMetaDataFound' ), function( ) {
				controller.prevScreen( InforMetaScreen.EXIT_CANCEL );
			} );
			return;
		}

		if ( fgObj.PROCNAME ) {
			PROC = fgObj.PROCNAME;
		} else {
			var idx = 0, flds = this.fieldData, l = flds.length, fld = null;

			for ( ; idx < l; ++idx ) {
				fld = flds[ idx ];
				if ( fld.FGNAME === this.currentFieldGroup ) {
					PROC = fld.FGPROCNAME;
					fgObj.PROCNAME = PROC;
					break;
				}
			}
		}

		if ( !PROC || PROC.length === 0 ) {
			if ( isDebugOn( 'FGS' ) )
				console.error( screenDebug( 'FGS', this, 'missing field group information', 'no procedure name found' ) );
			displayPageError( SCElocalize( 'Error_InvalidMetaDataFound' ), function( ) {
				controller.prevScreen( InforMetaScreen.EXIT_CANCEL );
			} );
			return;
		}

		var appFlag = '';
		if ( PROC.startsWith( appConfig.procPrefix ) ) {
			appFlag = PROC.substring( appConfig.procPrefix.length );
		} else {
			appFlag = PROC;
		}

		var sendString = 'EXEC ' + PROC + ' ' + buildXMITHeader( PROC, appFlag );
		var idx = 0, input = null, inputs = fgObj.inputs, l = inputs.length;

		for ( ; idx < l; ++idx ) {
			input = inputs[ idx ];
			sendString = sendString + addDataParameters( input.getRawValue( ) );
		}

		inFieldGroupCheck = true;
		ws.sendMessage( PROC, sendString, function( data, callbackData ) {
			try {
				var values = data.split( parmDelimiter );
				var group = currentScreen.FGS[ currentScreen.currentFieldGroup ];
				if ( typeof group === 'undefined' )
					return;

				decodeArray( values );
				var rectype = stringToInt( values[ 5 ] );

				var setReturnValuesIntoWidgets = function( ) {
					var vIdx = 9, fIdx = 0, vLength = values.length, fLength = group.outputs.length, widget = null, value = null, maxY = null;

					for ( vIdx = 0; vIdx < 9; ++vIdx ) {
						widget = currentScreen.VECTORS[ 'RECEIVE' ][ vIdx ];
						if ( widget ) {
							if ( widget.isVisible( ) && !widget.isReadonly( ) && ( !maxY || ( maxY.VPOS > widget.VPOS ) ) ) {
								maxY = widget;
							}
							if ( isDebugOn( "LOADDATA" ) )
								console.debug( widgetDebug( 'LOADDATA', widget, 'RECEIVE DATA', 'OLD[' + widget.RVALUE + '] NEW[' + values[ vIdx ] + ']' ) );
							widget.setValue( values[ vIdx ] );
							widget.inDisplaySync = true;
						}
					}

					for ( vIdx = 9; vIdx < vLength && fIdx < fLength; ++vIdx, ++fIdx ) {
						value = values[ vIdx ];
						group.outputs[ fIdx ].setValue( value );
						group.outputs[ fIdx ].inDisplaySync = true;
					}
					currentScreen.resume = true;
					currentScreen.buildScreen( false, false, false, false );
					currentScreen.resume = false;

					if ( isDebugOn( "WIDGET" ) && maxY )
						console.debug( widgetDebug( 'LOADDATA', maxY, 'field to focus after user gets control', null ) );

					return ( nextWidget && maxY && nextWidget.VPOS > maxY.VPOS ? nextWidget : maxY );
				};

				var setFocusedFieldAfterReturn = function( focusWidget ) {
					try {
						if ( rectype === 9 || rectype === 999 ) {
							if ( group && group.inputs.length > 0 ) {
								if ( isDebugOn( 'FGS' ) )
									console.debug( screenDebug( 'FGS', currentScreen, 'setFocusFieldAfterReturn:error', 'using field group inputs' ) );
								for ( var idx = group.inputs.length - 1; idx >= 0; --idx ) {
									if ( group.inputs[ idx ].isVisible( ) ) {
										group.inputs[ idx ].focus( !FIRE_FG_HANDLER );
										break;
									}
								}

							} else if ( currentScreen.firstField ) {
								if ( isDebugOn( 'FGS' ) )
									console.debug( screenDebug( 'FGS', currentScreen, 'setFocusFieldAfterReturn:error', 'using currentScreen defined first field' ) );
								currentScreen.firstField.focus( !FIRE_FG_HANDLER );
							}
						} else {
							if ( focusWidget ) {
								focusWidget.focus( !FIRE_FG_HANDLER );
								currentScreen.setCurrentFieldGroup( focusWidget.FGNAME );
							} else if ( nextWidget ) {
								nextWidget.focus( !FIRE_FG_HANDLER );
								currentScreen.setCurrentFieldGroup( nextWidget.FGNAME );
							} else {
								currentScreen.setCurrentFieldGroup( );
							}
						}
					} catch ( e ) {
						console.error( e.message ? e.message : e );
					}
				};

				if ( rectype === 9 || rectype === 999 ) {
					displayPageError( values[ 7 ], function( ) {
						var focusWidget = null;
						if ( rectype === 999 ) {
							focusWidget = setReturnValuesIntoWidgets( );
						} else {
							currentScreen.enableScreen( );
							if ( appConfig.isTablet ) {
								$( '#nextScreenButton' ).enable( );
								$( '#prevScreenButton' ).enable( );
							}
						}
						setFocusedFieldAfterReturn( focusWidget );
					} );
				} else {
					var focusWidget = setReturnValuesIntoWidgets( );
					if ( !nextWidget && currentScreen.VALIDATEINPUT ) {
						var focused = $( ':focus' );
						if ( currentScreen.lastField && focused.attr( 'id' ) != currentScreen.lastField.ID ) {
							// this is not the last field in the list for this VALIDATEINPUT screen.
							// bump up the displayed rows to the next editable field and redisplay
							var tempWidget = currentScreen.findNextValidateField( true );
							currentScreen.validateRow = typeof tempWidget === 'number' ? tempWidget : tempWidget.VPOS;

							var maxRowsPerPage = currentScreen.calculateMaxRowsPerPage( );
							var maxRow = ( maxRowsPerPage * currentScreen.currPage ); // 0 based rows
							if ( currentScreen.validateRow <= maxRow ) {
								if ( tempWidget.VPOS )
									nextWidget = tempWidget;
								currentScreen.buildScreen( true, false, false, true );
								setFocusedFieldAfterReturn( focusWidget );
								return false;
							}
						}
					}
					if ( !nextWidget ) {
						if ( isDebugOn( 'FGS' ) )
							console.debug( screenDebug( 'FGS', currentScreen, 'FG Finished', 'No next widget so next screen logic' ) );
						currentScreen.setCurrentFieldGroup( );
						inFieldGroupCheck = false;
						currentScreen.nextScreenCheck( 1 );
					} else {
						if ( isDebugOn( 'FGS' ) )
							console.debug( screenDebug( 'FGS', currentScreen, 'FG Finished', 'Set focus to ' + ( focusWidget ? focusWidget.NAME : nextWidget.NAME ) ) );
						setFocusedFieldAfterReturn( focusWidget );
					}
				}
			} finally {
				inFieldGroupCheck = false;
				currentScreen.enableScreen( );
			}
		}, null, false );
	},

	setCurrentFieldGroup : function( newFieldGroupName ) {
		if ( newFieldGroupName ) {
			if ( isDebugOn( 'FGS' ) )
				console.debug( simpleDebug( 'FGS', 'setting field group', newFieldGroupName ) );
			this.currentFieldGroup = newFieldGroupName;
		} else {
			if ( isDebugOn( 'FGS' ) )
				console.debug( simpleDebug( 'FGS', 'unsetting field group', 'null' ) );
			this.currentFieldGroup = null;
		}
	},
	verifyBeforeNextScreen : function( ) {
		if ( this.MENU || this.DISPLAYONLY || !this.hasEditableFields( ) || this.XMITONLY )
			return null;

		var idx = 0;
		var size = this.screenFields.length;
		var widget;

		var rowsPerColumn = this.calculateMaxRowsPerColumn( );
		var maxRow = this.calculateMaxRowID( rowsPerColumn, appConfig.columns, this.currPage );
		var minRow = this.calculateMinRowID( maxRow, rowsPerColumn );

		for ( ; idx < size; ++idx ) {
			widget = this.screenFields[ idx ];
			var col = this.fitsInColumnOnPage( widget, rowsPerColumn, minRow, maxRow );

			if ( col < 0 || widget.WTYPE === WIDGET_LABEL )
				continue;

			if ( widget.isVisible( ) && !widget.isReadonly( ) && widget.isRequired( ) && widget.isBlank( ) ) {
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( 'SCREENFLOW', 'VALIDATE', widget.NAME, 'required but blank' );
				widget.focus( !FIRE_FG_HANDLER );
				return SCElocalize( "Error_RequiredFieldsMissing" );
			}
			if ( widget.isVisible( ) && !widget.isReadonly( ) && !widget.validateContents( ) ) {
				if ( isDebugOn( "SCREENFLOW" ) )
					console.debug( 'SCREENFLOW', 'VALIDATE', widget.NAME, 'failed mask test' );
				widget.focus( !FIRE_FG_HANDLER );
				return SCElocalize( "Error_InvalidDataInField", widget.NAME );
			}
		}

		return null;
	},
	handleXMITReturn : function( data ) {
		try {
			var retValues = null;
			if ( this.screenName != 'L1' && data.indexOf( dataDelimiter ) ) {
				// data is meant for a SELECTOR screen since we have multiple
				// rows.
				this.selectorData = data;
				retValues = data.split( dataDelimiter );

				if ( retValues.length === 1 ) {
					retValues = retValues.slice( 0, 2 ).join( parmDelimiter ).split( parmDelimiter );
				} else {
					this.searchResultData = retValues.slice( 1, retValues.length );
					retValues = retValues.slice( 0, 2 ).join( parmDelimiter ).split( parmDelimiter );

					// multiple records came back, with the way we split and
					// join and all that
					// it ends up with the 9th value being extraneous so it
					// needs to go.
					retValues.splice( 9, 1 );
				}
			} else {
				retValues = data.split( parmDelimiter );

			}

			if ( typeof this.searchResultData !== 'undefined' ) {
				decodeArray( this.searchResultData );
				if ( isDebugOn( "LOADDATA" ) )
					console.debug( screenDebug( 'LOADDATA', this, 'process step 3 - searchResultData', this.searchResultData ) );
			}
			decodeArray( retValues );
			if ( isDebugOn( "LOADDATA" ) )
				console.debug( screenDebug( 'LOADDATA', this, 'process step 4. retValues', retValues ) );

			var error = stringToInt( retValues[ 5 ] );
			var retValuesIdx = 0;
			// 6th position (5th?) is the error code.
			// 8th position (7th?) is msg
			if ( this.screenName == 'L1' ) {
				var msg = null;
				try {
					msg = decode( retValues[ 7 ] );
				} catch ( e ) {
					console.error( 'error in decodeURIComponent', e, retValues[ 7 ] );
					msg = "Unable to decode error message!";
				}

				if ( error == 9 ) {
					displayPageError( msg );
				} else {
					// 9 security token
					// 10 msg security/permissions
					// 11 locale
					// 12 delegated user
					// 13 meta profile
					// 14 date fmt for server
					// 15 user pref date fmt (short or long)
					// 16 user pref time fmt (short or long)
					// 17 user TZ name ( ignore )
					// 18 user pref datetime fmt
					// 19 user pref currency unused
					// 20 user pref sorting unused
					// 21 barcode prefixes
					// 22 barcode format identifiers unused
					// 23 barcode DATA elements. unused
					// 24 and on is warehouse information in blocks of 3
					// meaning 24,26,27 are info for the same warehouse
					// and then the next 3 indexes are for a different warehouse
					// DBAlias, Field, Value

					// we logged in. We need to show the warehouse selection screen.
					// REMOVE the login HTML so no snooping can occur on login information
					loginDIV.remove( );
					var idx = 8;
					appConfig.st = decode( retValues[ ++idx ] );
					userConfig.msgsec = parseInt( retValues[ ++idx ] );
					userID = decode( retValues[ ++idx ] );
					usersLocale = retValues[ ++idx ].replace( /_/gi, '-' );;
					usersProfile = retValues[ ++idx ];
					appConfig.serverDateFmt = retValues[ ++idx ]; // date fmt for server
					appConfig.serverDateTimeFmt = appConfig.serverDateFmt;
					if ( appConfig.serverDateFmt.length > 10 ) {
						var dateTime = appConfig.serverDateFmt.split( ' ' );
						appConfig.serverDateFmt = dateTime[ 0 ];
					}
					// server is sending hh:mm:ss which isn't valid for the date strings
					// the server is sending us 13:21:21 is invalid for hh:mm:ss but 
					// it is valid for HH:mm:ss.
					appConfig.serverDateTimeFmtSet = appConfig.serverDateTimeFmt.replace('hh:','HH:');
					userConfig.dateFmt = retValues[ ++idx ]; // values are short,long
					userConfig.timeFmt = retValues[ ++idx ]; // values are short,long
					userConfig.facilityTZ = parseInt( retValues[ ++idx ] );
					// locale name to be used for dates. SCE has en_US and SOHO expects en-US
					usersDateLocale = retValues[ ++idx ].replace( /_/gi, '-' );
					userConfig.currencyFmt = retValues[ ++idx ]; // unused
					userConfig.sorting = retValues[ ++idx ]; // unused

					var brcdValues = retValues[ ++idx ];
					if ( brcdValues.length > 0 && brcdValues.indexOf( dataDelimiter ) != -1 ) {
						brcdValues = brcdValues.split( dataDelimiter );
						// values come in pairs. first is group name, second is prefix

						var tmp = null;
						for ( var bIdx = 0; bIdx < brcdValues.length; ++bIdx ) {
							tmp = brcdValues[ bIdx ];
							if ( tmp.indexOf( fieldDelimiter ) != -1 ) {
								tmp = tmp.split( fieldDelimiter );
								if ( tmp && tmp[ 1 ] && tmp[ 1 ] != 'null' )
									appConfig.barcodeConfig.BRCDID.push( tmp[ 1 ] );
							}
						}
					}
					++idx; // format ident unused.
					++idx; // barcode DATA elements. unused.
					appConfig.barCode = new InforBarcode( appConfig.barcodeConfig );
					warehouses = retValues.slice( ++idx );

					setMessageSecurity( );
					youveGotMail( );
					getJSONLocaleUser( usersLocale, true, function(){
						loadUserConfig( );
					});					
					return;
				}
			} else {
				try {
					retValues[ 7 ] = decodeURIComponent( retValues[ 7 ] );
				} catch ( e ) {
					console.error( 'error in decodeURIComponent', e, retValues[ 7 ] );
					retValues[ 7 ] = "Unable to decode error message!";
				}
				var rVector = currentScreen.VECTORS[ 'RECEIVE' ], widget = null, dWidget = null, idx = 0, rLength = rVector.length;

				for ( ; idx < rLength; ++idx ) {
					widget = rVector[ idx ];
					if ( retValues.length > retValuesIdx ) {
						if ( isDebugOn( "LOADDATA" ) )
							console.debug( widgetDebug( 'LOADDATA', widget, 'SET RECEIVE VALUE', getValue( retValues[ retValuesIdx ] ) ) );
						widget.setValue( getValue( retValues[ retValuesIdx ] ), true );
						++retValuesIdx;
					} else {
						widget.setValue( '', true );
					}

					if ( this.SELECTOR ) {
						// SELECTOR screens automatically copy all RECEIVE
						// values into the DISPLAY
						dWidget = this.getWidgetByName( widget.NAME, 'DISPLAY', false );
						if ( dWidget ) {
							dWidget.setValue( widget.getRawValue( ), false );
						}
					}
				}

				this.state.ERRORCODE = error;
				this.xmitMessage = this.getMessage( retValues[ 7 ] );
				if ( this.state.ERROROCDE === 9 ) {
					controller.setError( 9, this.xmitMessage );
				}

				if ( this.SELECTOR ) {
					var cWidget = this.getWidgetByName( 'recnum' );
					if ( cWidget ) {
						cWidget.setValue( '' + this.currREC );
					}
				}
			}

			currentScreen.enableScreen( );
			this.resumeProcessing( true );
		} finally {

		}
	},
	processDynamicDefaults : function( fields ) {
		// var screenName = fields[0];
		// var screenVersion = fields[1];
		var widgetName = fields[ 2 ];
		var vectorName = fields[ 3 ];

		var theWidget = this.getWidgetByName( widgetName, vectorName, false );
		if ( theWidget ) {
			if ( typeof this.DD[ widgetName ] === 'undefined' ) {
				this.DD[ widgetName ] = [ ];
				this.DD.length += 1;
			}

			var iWidgetName = fields[ 4 ];
			var iVectorName = fields[ 5 ];
			var ddidx = parseInt( fields[ 6 ] );
			var iWidget = this.getWidgetByName( iWidgetName, iVectorName, false );

			if ( iWidget ) {
				this.DD[ widgetName ].push( {
					idx : ddidx,
					widget : iWidget
				} );
			}
		}
	},
	processExpression : function( fields ) {
		if ( fields.length == 1 && ( fields[ 0 ].length == 0 || fields[ 0 ] === ',' ) ) {
			return;
		} else if ( fields.length < 5 ) {
			console.error( 'expr record is not valid, too few parameters' );
			return;
		}
		if ( this.hasOwnProperty( fields[ 2 ] ) ) {
			this[ fields[ 2 ] ] = true;
		} else if ( fields[ 2 ] == 'CALCFIELDPOS' ) {
			// obsolete. Not used with WebRF.
			var lines = fields[ 1 ].replace( 'CALCFIELDPOS(', '' ).replace( ')', '' ).split( ',' );
			this.CFP_TOP = parseInt( lines[ 0 ] );
			this.CFP_BTM = parseInt( lines[ 1 ] );
			this.CFP_BTM = ( this.CFP_BTM < 0 ? appConfig.RFHeight + this.CFP_BTM : appConfig.RFHeight - this.CFP_BTM ) + 1;
		} else {
			var inst = {};
			inst.IDX = fields[ 0 ];
			inst.POS = fields[ 0 ];
			inst.PLIST = fields[ 1 ];
			inst.NAME = fields[ 2 ];
			inst.SCR1 = fields[ 3 ];
			inst.SCR2 = fields[ 4 ];
			this.instructData.push( inst );
			this.hasFKEYS = inst.NAME.substring( 0, 3 ) === 'KEY' ? true : this.hasFKEYS;
			this.hasCancel = inst.NAME === 'CANCEL' ? true : this.hasCancel;
		}
	},
	processWidget : function( fields ) {
		var widget = new InforMetaWidget( this, fields );
		widget.SCREENNAME = this.screenName;

		if ( widget.WTYPE != 0 && fields[ 8 ].length > 0 ) {
			var label = new InforMetaWidget( this );
			label.copy( widget );
			label.UPPER = 0;
			label.ID = label.NAME + 'Label';
			label.NAME = label.ID;
			label.WTYPE = 0;
			label.VPOS = parseInt( fields[ 10 ] );
			label.ORIGVPOS = label.VPOS;
			label.HPOS = parseInt( fields[ 9 ] );
			label.setValue( fields[ 8 ] );
			label.ECHOCHAR = null;
			label.EDIT_STATE = null;
			label.EXPR_EDIT = "0";
			label.FGNAME = '';
			label.RVALUE = '';
			label.DVALUE = '';
			delete label.FGIDX;
			delete label.IMGIDX;
			delete label.FGIDXRET;

			widget.LABEL = label;
			label.INPUT = widget;
			this.fieldData.push( label );
		}

		if ( typeof widget.IMGIDX === 'number' ) {
			if ( widget.IMGIDX == 1 )
				this.itemKeys.STORERKEY = widget;
			else if ( widget.IMGIDX == 2 )
				this.itemKeys.ITEMKEY = widget;
			else if ( widget.IMGIDX == 3 )
				this.itemKeys.UOM = widget;
		}

		this.fieldData.push( widget );
		this.VECTORS[ widget.VTYPE ].push( widget );

		if ( widget.DBNAME.length > 0 ) {
			if ( !this.DBNAMES[ widget.DBNAME ] )
				this.DBNAMES[ widget.DBNAME ] = [ ];

			this.DBNAMES[ widget.DBNAME ].push( widget );
		}
	},
	// retrieving the raw layout information from the server.
	loadScreenData : function( data ) {

		try {
			this.fieldData = [ ];
			this.instructData = [ ];
			this.screenFields = [ ];
			this.selectorFields = [ ];
			this.selectorData = [ ];
			this.validateRow = 1;
			var fields;
			var records = data.split( dataDelimiter );

			var controls = records[ 0 ];
			if ( typeof controls != 'undefined' ) {
				controls = controls.split( parmDelimiter );

				if ( stringToInt( controls[ 5 ] ) === 9 ) {
					displayPageError( decode( controls[ 7 ] ), function( ) {
						controller.prevScreen( InforMetaScreen.EXIT_ERROR );
					} );
					return false;
				}
			}

			// first record is control stuff, ignore it.
			for ( var idx = 1, l = records.length; idx < l; ++idx ) {
				fields = records[ idx ].split( fieldDelimiter );
				if ( fields.length === 1 ) {
					// some odd spaces between widgets, ignore these.
					continue;
				} else if ( fields.length === 8 ) {
					// it's a dynamic default grouping.
					this.processDynamicDefaults( fields );
				} else if ( fields.length === 7 && fields[ 0 ] === 'FIELDGROUP' ) {
					// 0 record ID
					// 1 FG name
					// 2 widget name
					// 3 widget vector
					// 4 index
					// 5 input/output flag (1 or 0)
					// 6 blank fluff space
					var fgName = fields[ 1 ];
					var widgetName = fields[ 2 ];
					var widgetVector = fields[ 3 ];
					// var parmIdx = parseInt(fields[4]); // unused for now
					var input = fields[ 5 ] === '1';

					if ( !this.FGS[ fgName ] ) {
						this.FGS[ fgName ] = {
							name : fgName,
							inputs : [ ],
							outputs : [ ]
						};
					}
					var widget = this.getWidgetByName( widgetName, widgetVector, false );
					if ( widget ) {
						if ( input ) {
							this.FGS[ fgName ].inputs.push( widget );
						} else {
							this.FGS[ fgName ].outputs.push( widget );
						}
					} else {
						console.error( 'FIELDGROUP', this.screenName, 'WIDGET NOT FOUND!', widgetName, widgetVector );
					}

				} else if ( fields.length === 6 ) {
					this.processExpression( fields );
				} else {
					this.processWidget( fields );
				}
			}

			var idx = 0, l = this.fieldData.length, widget = null;

			for ( ; idx < l; ++idx ) {
				widget = this.fieldData[ idx ];
				if ( widget.EXPR_VIS != '0' && ( ( widget.VTYPE == 'SEND' && ( ( this.MENU && widget.WTYPE === WIDGET_LABEL ) || ( !this.MENU ) ) ) || ( widget.VTYPE == 'DISPLAY' && !this.VALIDATEINPUT && !this.MENU ) ) ) {
					if ( widget.LABEL )
						this.screenFields.push( widget.LABEL );

					if ( !widget.INPUT )
						this.screenFields.push( widget );
				}
			}

			if ( this.VALIDATEINPUT ) {
				sortArrayByKey( this.screenFields, [
						{
							key : 'VPOS'
						}, {
							key : 'HPOS'
						}
				] );
				idx = 0;
				length = this.screenFields.length;
				widget = null;

				var fields = this.screenFields, tIdx = 0;

				//
				// this checks for fields that are sitting on the same line.
				// We need everything to be on separate lines, though we keep the INPUT label
				// with the INPUT.
				//
				for ( ; idx < length - 1; ++idx ) {
					//
					// means this is tied to an INPUT, handle this below with the input.
					// we don't want the label tied to this input to get on separate lines.
					//
					if ( fields[ idx ].INPUT )
						continue;

					if ( fields[ idx ].VPOS != fields[ idx + 1 ].VPOS )
						continue;

					for ( tIdx = idx + 1; tIdx < length; ++tIdx ) {
						if ( fields[ tIdx ].INPUT )
							continue;

						fields[ tIdx ].VPOS += 1;
						if ( fields[ tIdx ].LABEL )
							fields[ tIdx ].LABEL.VPOS = fields[ tIdx ].VPOS;
					}
				}

				idx = 0;
				for ( ; idx < length; ++idx ) {
					widget = this.screenFields[ idx ];

					if ( widget.INPUT || widget.EXPR_VIS === '0' || widget.STATIC == 1 )
						continue;

					// space out everything, then insert fake validate widgets inbetween.
					// when adjustRows is called it will collapse any spaces left where we did not
					// insert fake validate widgets
					widget.VPOS = widget.VPOS * 10;
					widget.ORIGVPOS = widget.VPOS;

					if ( widget.LABEL ) {
						widget.LABEL.VPOS = widget.LABEL.VPOS * 10;
						;
						widget.LABEL.ORIGVPOS = widget.LABEL.VPOS;
					}

					if ( widget.EXPR_EDIT === '0' )
						continue;

					var validateWidget = new InforMetaWidget( this );
					validateWidget.copy( widget );
					validateWidget.ID += '_VAL';
					validateWidget.NAME += '_VAL';
					validateWidget.VPOS = validateWidget.VPOS - 2;
					validateWidget.ORIGVPOS = validateWidget.VPOS;
					validateWidget.EXPR_EDIT = '0';
					validateWidget.REAL = widget;
					delete validateWidget.LABEL;
					delete validateWidget.INPUT;
					this.screenFields.push( validateWidget );
					widget.FAKE = validateWidget;

					if ( widget.LABEL ) {
						var labelValidateWidget = new InforMetaWidget( this );
						labelValidateWidget.copy( widget.LABEL );
						labelValidateWidget.ID += '_VAL';
						labelValidateWidget.NAME += '_VAL';
						labelValidateWidget.VPOS = labelValidateWidget.VPOS - 2;
						labelValidateWidget.ORIGVPOS = labelValidateWidget.VPOS;
						labelValidateWidget.EXPR_EDIT = '0';
						labelValidateWidget.REAL = widget.LABEL;
						delete labelValidateWidget.LABEL;
						delete labelValidateWidget.INPUT;
						this.screenFields.push( labelValidateWidget );
						widget.LABEL.FAKE = labelValidateWidget;
					}
				}
			}

			// fields come to us in display order, put these two arrays in
			// vector order
			sortArrayByKey( this.VECTORS[ 'RECEIVE' ], [
				{
					key : 'VTYPEPOS'
				}
			] );
			sortArrayByKey( this.VECTORS[ 'SEND' ], [
				{
					key : 'VTYPEPOS'
				}
			] );

			if ( this.VECTORS[ 'HEADER' ].length > 1 )
				sortArrayByKey( this.VECTORS[ 'HEADER' ], [
						{
							key : 'VPOS'
						}, {
							key : 'HPOS'
						}
				] );

			if ( this.VECTORS[ 'FOOTER' ].length > 1 )
				sortArrayByKey( this.VECTORS[ 'FOOTER' ], [
						{
							key : 'VPOS',
							order : 'DESC'
						}, {
							key : 'HPOS'
						}
				] );

			// get the labels and widgets in draw order
			sortArrayByKey( this.screenFields, [
					{
						key : 'VPOS'
					}, {
						key : 'HPOS'
					}
			] );

			// these should come in IDX order but just in case
			var key = null;
			for ( key in this.DD ) {
				if ( key === 'length' )
					continue;

				sortArrayByKey( this.DD[ key ], [
					{
						key : 'idx'
					}
				] );
			}

			var idx = 0, flds = this.screenFields, l = flds.length, nxtWdgt = null, wdgt = null;

			for ( ; idx < l; ++idx ) {
				wdgt = flds[ idx ];
				nxtWdgt = flds[ idx + 1 ];
				if ( typeof nxtWdgt !== 'undefined' && nxtWdgt.VPOS == wdgt.VPOS ) {
					wdgt.VIS_LEN = nxtWdgt.HPOS - wdgt.HPOS + ( wdgt.WTYPE == 2 ? 1 : 0 );
				}
			}

			this.parsedInstructData = [ ];
			this.globals.hasGlobals = false;
			this.globals.SEND = {};
			this.globals.RECEIVE = {};
			this.globals.DISPLAY = {};
			var tempArray = this.instructData;
			var tempInst = null;
			var tInst = null;
			var isNew = true;
			for ( var idx = 0, l = tempArray.length; idx < l; ++idx ) {
				tempInst = tempArray[ idx ];

				if ( instructionsLevel1.indexOf( tempInst.NAME ) != -1 || ( tempInst.NAME === 'SET' && tempInst.PLIST.startsWith( 'SETSCREEN' ) ) ) {
					var parsed = new InforMetaExpression( );
					parsed.parseInstruction( tempInst, tempArray );
					if ( parsed.func == 'GLOBALSEND' ) {
						this.addGlobal( parsed );
					}

					isNew = true;
					for ( var tIdx = 0; tIdx < this.parsedInstructData.length; ++tIdx ) {
						tInst = this.parsedInstructData[ tIdx ];
						if ( tInst.merge( parsed ) ) {
							isNew = false;
						}
					}

					if ( isNew )
						this.parsedInstructData.push( parsed );
				}
			}

			var reSort = false;
			// check if we have any optionkey instructions and if those
			// instructions have a msg that needs to get displayed on screen.
			var iIdx = 0, iLength = this.parsedInstructData.length, i = null;
			for ( ; iIdx < iLength; ++iIdx ) {
				i = this.parsedInstructData[ iIdx ];
				if ( i.func === 'OPTIONSKEY' && i.msg && i.msg.length > 0 ) {
					reSort = true;
					var opKeyLabel = new InforMetaWidget( this );
					opKeyLabel.NAME = 'OPTIONSKEY_HELPLINE_' + i.key;
					opKeyLabel.OPTIONSKEY = i.key.trim( );
					opKeyLabel.WTYPE = 0;
					opKeyLabel.VTYPE = 'DISPLAY';
					opKeyLabel.VTYPEPOS = 0;
					opKeyLabel.TEXT = i.msg;
					opKeyLabel.EXPR_VIS = '1';
					opKeyLabel.VPOS = 9998;
					opKeyLabel.ORIGVPOS = 9998;
					opKeyLabel.HPOS = 0;
					opKeyLabel.ID = opKeyLabel.NAME;
					this.screenFields.push( opKeyLabel );
				}
			}

			if ( reSort ) {
				sortArrayByKey( this.screenFields, [
						{
							key : 'VPOS'
						}, {
							key : 'HPOS'
						}
				] );
			}

			if ( this.MENU == true ) {
				this.DISPLAYONLY = true;
				controller.setTopMenu( this.screenName );
			}

		} finally {

		}

		return true;
	},
	// loads any field values passed to this screen from any other screens
	loadData : function( ) {
		try {
			var passed = this.getPassedData( this.screenName );
			if ( isDebugOn( "SCREENFLOW" ) )
				console.debug( screenDebug( 'SCREENFLOW', this, 'load data object', passed ) );
			if ( passed ) {
				this.incomingData.push( passed );
				if ( this.SELECTOR && typeof passed.selectorData === 'object' ) {
					this.selectorData = passed.selectorData;
					decodeArray( this.selectorData );
					this.setRecordTotal( this.selectorData.length );
					selectorDIV.find( '#rectot' ).html( this.totalREC );
					selectorDIV.find( '#recnum' ).html( 0 );
				}

				if ( typeof passed.searchResultData !== 'undefined' ) {
					this.searchResultData = passed.searchResultData;
					this.searchResultIndex = 0;
				}

				if ( passed.data.length ) {
					var vRec, widget, data, l, idx, setDisplaySync = false;
					if ( this.resume && ( ( controller.LKCALLER && this.LKUPCALLED ) || ( this.getKeyStroke( ) ) ) ) {
						// this screen called a lookup. The lookup was a selector screen.
						// that selector screen has multiple field values coming back for the selected
						// record. We're setting those values BUT edit state gets in the way
						setDisplaySync = true;
					}

					idx = 0;
					data = passed.data;
					l = data.length;
					for ( ; idx < l; ++idx ) {
						vRec = data[ idx ];
						if ( this.VALIDATEINPUT ) {
							widget = this.getScreenWidgetByName( vRec.name + '_VAL' );
							if ( widget ) {
								if ( isDebugOn( "LOADDATA" ) )
									console.debug( widgetDebug( 'LOADDATA', widget, '', 'NEW[' + vRec.value + '] OLD[' + widget.getRawValue( ) + ']' ) );
								widget.setValue( getValue( vRec.value ) );
							}
						}

						widget = this.getWidgetByName( vRec.name, vRec.dest, false );
						if ( widget ) {
							if ( widget.WTYPE == WIDGET_IMAGE ) {
								if ( isDebugOn( "LOADDATA" ) )
									console.debug( widgetDebug( 'LOADDATA', widget, '', 'NEW[' + vRec.value.length + '] OLD[' + widget.getRawValue( ).length + ']' ) );
								if ( !vRec.value.startsWith( 'data:' ) ) {
									vRec.value = 'data:application/octet-stream;base64,' + hexToBase64( vRec.value );
								}
								widget.setValue( vRec.value );
								$( '#' + widget.ID ).css( {
									'background-image' : 'url("' + vRec.value + '")'
								} );
							} else {
								if ( isDebugOn( "LOADDATA" ) )
									console.debug( widgetDebug( 'LOADDATA', widget, '', 'NEW[' + vRec.value + '] OLD[' + widget.getRawValue( ) + ']' ) );
								widget.setValue( getValue( vRec.value ) );
							}
							if ( setDisplaySync )
								widget.inDisplaySync = true;
						}

						// trident allowed copies of the same fields to exist in the same vector/screen
						// WebRF does not allow this, so copies get 999 added to the end but we still need to assign
						// the same values.
						if ( vRec.name.endsWith( '999' ) ) {
							widget = this.getWidgetByName( vRec.name.substring( 0, vRec.name.length - 3 ), vRec.dest, false );
							if ( widget ) {
								if ( isDebugOn( "LOADDATA" ) )
									console.debug( widgetDebug( 'LOADDATA', widget, '', 'NEW[' + vRec.value + '] OLD[' + widget.getRawValue( ) + ']' ) );
								widget.setValue( getValue( vRec.value ) );
							}
						} else {
							widget = this.getWidgetByName( vRec.name + '999', vRec.dest, false );
							if ( widget ) {
								if ( isDebugOn( "LOADDATA" ) )
									console.debug( widgetDebug( 'LOADDATA', widget, '', 'NEW[' + vRec.value + '] OLD[' + widget.getRawValue( ) + ']' ) );
								widget.setValue( getValue( vRec.value ) );
							}
						}
					}

				}
			}
			if ( isDebugOn( "SCREENFLOW" ) )
				console.debug( screenDebug( 'SCREENFLOW', this, 'current xmitReturnCode', this.state.ERRORCODE ) );
		} finally {
			// once processed, remove it so it's not processed again.
			this.setPassedData( this.screenName, null );
			this.dump( 'AFTER LOAD PASSED DATA' );
		}
		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( screenDebug( 'SCREENFLOW', this, 'incoming data', this.incomingData ) );
	},
	/*
	 * Saving the current screens data to be passed to the screen named in the instruction P. When the new screen loads it will pull up this data from sessionStorage
	 */
	saveData : function( p ) {

		try {
			// Assume the EXPR of this instruction has been verified already.
			var saveObject = {};
			saveObject.data = [ ];
			saveObject.retdata = [ ];
			saveObject.retdataScreen = this.screenName;
			if ( !this.SELECTOR && this.selectorData.length > 0 ) {
				saveObject.selectorData = [ ];

				// rows should at minimum have 2 items in it.
				var rows = this.selectorData.split( dataDelimiter );
				var compRawValues = rows[ 0 ].split( ',' );
				var compValues = {
					ptcid : compRawValues[ 0 ],
					userid : compRawValues[ 1 ],
					taskid : compRawValues[ 2 ],
					compid : compRawValues[ 3 ],
					appflag : compRawValues[ 4 ],
					rectype : compRawValues[ 5 ],
					server : compRawValues[ 6 ],
					miscmsg : compRawValues[ 7 ],
					rectotal : compRawValues[ 8 ]
				};
				var rowIdx = 1;
				var rowCount = rows.length;
				var fields = null;
				var fieldIdx = 1;
				var rVector = this.VECTORS[ 'RECEIVE' ];
				var rVectorSize = rVector.length;
				var rVectorIdx = 0;
				var widget = null;
				var obj = null;

				for ( ; rowIdx < rowCount; ++rowIdx ) {
					fields = rows[ rowIdx ].split( parmDelimiter );

					fieldIdx = 1; // first item extra space, ignore it.
					rVectorIdx = 0;
					obj = new Object( );
					for ( ; rVectorIdx < rVectorSize; ++rVectorIdx ) {
						widget = rVector[ rVectorIdx ];
						if ( compValues[ widget.NAME ] ) {
							if ( isDebugOn( "LOADDATA" ) )
								console.debug( widgetDebug( 'LOADDATA', widget, 'save object comp', compValues[ widget.NAME ] ) );
							obj[ 'RECEIVE_' + widget.NAME ] = compValues[ widget.NAME ];
						} else if ( typeof fields[ fieldIdx ] !== 'undefined' ) {
							if ( isDebugOn( "LOADDATA" ) )
								console.debug( widgetDebug( 'LOADDATA', widget, 'save object raw', fieldIdx, fields[ fieldIdx ] ) );
							obj[ 'RECEIVE_' + widget.NAME ] = fields[ fieldIdx ];
							++fieldIdx;
						} else {
							if ( isDebugOn( "LOADDATA" ) )
								console.debug( widgetDebug( 'LOADDATA', widget, 'save object', widget.getRawValue( ) ) );
							obj[ 'RECEIVE_' + widget.NAME ] = widget.getRawValue( );
						}
						obj[ 'DISPLAY_' + widget.NAME ] = obj[ 'RECEIVE_' + widget.NAME ];
					}
					saveObject.selectorData.push( obj );
				}
			}

			this.createPassedData( p, p.screen, false, saveObject );
		} catch ( e ) {
			console.error( e.message ? e.message : e );
		} finally {

		}
	},
	copyVectorToVector : function( theVector, sourceVector, destVector, destScreen, realTime ) {
		if ( typeof realTime === 'undefined' ) {
			realTime = false;
		}
		sourceVector = sourceVector.trim( );
		destVector = destVector.trim( );

		var tempArray = this.VECTORS[ sourceVector ];
		var tempWidget = null;
		var destWidget = null;
		var scr = null;
		if ( realTime ) {
			scr = controller.screens[ destScreen ];
		}

		for ( var idx = 0, l = tempArray.length; idx < l; ++idx ) {
			tempWidget = tempArray[ idx ];
			if ( realTime ) {
				destWidget = scr.getWidgetByName( tempWidget.NAME, destVector );
				if ( destWidget )
					destWidget.setValue( tempWidget.getRawValue( ) );
			} else {
				theVector.push( {
					name : tempWidget.NAME,
					value : tempWidget.getRawValue( ),
					dest : destVector
				} );
				if ( isDebugOn( "LOADDATA" ) )
					console.debug( widgetDebug( 'LOADDATA', tempWidget, 'Pass Field Data', 'To Screen[' + destScreen + '] source vector[' + sourceVector + '] dest vector [' + destVector + '] value[' + tempWidget.getRawValue( ) + ']' ) );
			}
		}
	},
	findNextWidget : function( widget, curIdx ) {
		for ( var idx = 0; idx < this.fieldData.length; ++idx ) {
			if ( idx == curIdx )
				continue;
			var nxtWdt = this.fieldData[ idx ];

			if ( nxtWdt.VPOS == widget.VPOS && nxtWdt.HPOS > widget.HPOS && ( nxtWdt.VTYPE != 'RECEIVE' ) && nxtWdt.isVisible( ) ) {
				return nxtWdt;
			}
		}

		return null;
	},

	findNextValidateField : function( returnWidget ) {
		var nextRow = this.validateRow + 1;
		var idx = 0;
		var l = this.screenFields.length;
		var widget = null;

		for ( ; idx < l; ++idx ) {
			widget = this.screenFields[ idx ];

			if ( typeof widget.REAL === 'undefined' && widget.WTYPE !== 0 && widget.isVisible( ) && !widget.isReadonly( ) && widget.VPOS >= nextRow ) {
				if ( returnWidget )
					return widget;
				else
					return ( widget.VPOS );
			}
		}
		return idx;
	},
	/*
	 * Take integer keycode and returns the character represented by that number
	 */
	mapKeyCodeToKeyStroke : function( keycode ) {
		return KEYMAP[ keycode ];
	},

	handleWarehouseSelection : function( warehouse, fromKeyEvent ) {
		if ( !fromKeyEvent )
			controller.lockInProcess( );
		warehouse = parseInt( warehouse );
		usersWarehouse = warehouses[ warehouse ];
		usersWarehouseName = warehouses[ warehouse + 2 ];
		if ( isDebugOn( "LOADDATA" ) )
			console.debug( 'LOADDATA', 'Login', userConfig );

		whseDlg.inforClose( );
		checkNewMessages( );

		// need to fire off and get facility time zone!
		var PROC = appConfig.facilityTZProc;
		var sendString = 'EXEC ' + PROC + ' ' + buildXMITHeader( PROC, PROC.substring( appConfig.procPrefix.length ) ) + addDataParameters( deviceCode, 'WebRF' );
		ws.sendMessage( PROC, sendString, function( data ) {
			if ( isDebugOn( "LOADDATA" ) )
				console.debug( 'LOADDATA', 'Login', data );
			var retValues = data.split( "," );
			decodeArray( retValues );
			if ( isDebugOn( "LOADDATA" ) )
				console.debug( 'LOADDATA', 'Login', retValues );
			var tz = retValues[ retValues.length - 1 ];
			if ( retValues.length > 2 )
				tz = retValues[ retValues.length - 2 ];
			if ( !isNaN( tz ) ) {
				tz = parseInt( tz );
				userConfig.facilityTZ = tz;
			}
			// --11.0 Default Facility Profile Enhancement
			// Got back a new profile from backend. It is the MOBILE_PROFILE for user,
			// else it could be the default facility profile (if one exists),
			// else it will be DEFAULT.
			var newProfile = retValues[ retValues.length - 1 ];
			if ( ( usersProfile == 'DEFAULT' || usersProfile.length == 0 ) && typeof newProfile !== 'undefined' ) {
				// the profile field should look like <12><profilename>`<12>
				try {
					newProfile = newProfile.split( dataDelimiter )[ 1 ].split( fieldDelimiter )[ 0 ];
				} catch ( e ) {
					newProfile = "DEFAULT";
				}

				if ( usersProfile != newProfile ) {
					controller.clearScreenCache( );
				}
				usersProfile = newProfile;
				if ( isDebugOn( "LOADDATA" ) )
					console.debug( 'LOADDATA', 'Login usersProfile', usersProfile );
			}
			// --11.0 Default Facility Profile Enhancement
			controller.initScreen( 'LL1', false, 1 );
		}, null, false );
	},
	beginStatusBarProcessing : function( status ) {
		if ( controller.procWindowIsUp )
			return;

		try {
			controller.procWindowIsUp = true;

			var pos = {
				at : 'left'
			};
			if ( appConfig.columns == 1 ) {
				pos.my = 'left+60';
			} else {
				pos.my = 'left+180';
			}

			$( 'body' ).inforBusyIndicator( {
				delay : 0,
				modal : true,
				text : status,
				position : pos
			} );
		} catch ( err ) {
		}
	},
	endStatusBarProcessing : function( ) {
		try {
			$( 'body' ).inforBusyIndicator( 'close' );
		} catch ( err ) {
		} finally {
			controller.procWindowIsUp = false;
		}
	},
	restoreScreenFields : function( updateValidateRows ) {
		var fields = this.screenFields;
		var size = fields.length;
		var widget;

		for ( var idx = 0; idx < size; ++idx ) {
			widget = fields[ idx ];
			widget.VPOS = widget.ORIGVPOS;

			if ( updateValidateRows && widget.FAKE ) {
				widget.FAKE.EXPR_VIS = widget.EXPR_VIS;
				widget.FAKE.setValue( widget.getValue( ) );
			}
		}
	},
	translate : function( msg ) {
		if ( msg.indexOf( '->' ) != -1 ) {
			var pc = msg.split( '->' );
			var vec = pc[ 0 ];
			var fld = pc[ 1 ];
			var widget = this.getWidgetByName( fld, vec, false );
			if ( widget ) {
				return widget.getDisplayValue( );
			}
		}

		return msg;
	},
	dump : function( msg ) {

		if ( !appConfig.debug.DUMP )
			return;

		var idx, size;
		var html = {
			'state' : msg,
			'screenName' : this.screenName,
			'displayText' : this.displayText,
			'xmitMessage' : this.xmitMessage,
			'xmitDone' : this.xmitDone,
			'numTimes' : this.getNumTimes( ),
			'currNumTimes' : this.getCurrNumTimes( ),
			'hasFKEYS' : this.hasFKEYS,
			'LKUPCALLED' : this.LKUPCALLED,
			'exitScreen' : this.getExit( ),
			'cancelScreen' : this.cancelScreen,
			'exitCode' : this.exitCode,
			'resume' : this.resume,
			'DISPLAYONLY' : this.DISPLAYONLY,
			'XMITONLY' : this.XMITONLY,
			'NOXMIT' : this.NOXMIT,
			'MENU' : this.MENU,
			'EXITONENTER' : this.EXITONENTER,
			'EXITONKEY' : this.EXITONKEY,
			'AUTOENTER' : this.AUTOENTER,
			'SELECTOR' : this.SELECTOR,
			'SKIPONBLANK' : this.SKIPONBLANK,
			'EXITONERROR' : this.EXITONERROR,
			'DELETEONENTER' : this.DELETEONENTER,
			'SEARCHRESULT' : this.SEARCHRESULT,
			'SHOWSINGLESCREEN' : this.SHOWSINGLESCREEN,
			'NOBRCDPARSE' : this.NOBRCDPARSE,
			'VALIDATEINPUT' : this.VALIDATEINPUT,
			'SENDIF_STATE' : this.state.SENDIF,
			'IFRECEIVE_STATE' : this.state.IFRECEIVE,
			'ERRORCODE_STATE' : this.state.ERRORCODE,
			'ERROR_STATE' : this.state.ERROR,
			'widgets' : [ ]
		};

		if ( typeof this.fldDump === 'undefined' ) {
			this.fldDump = this.fieldData;
			sortArrayByKey( this.fldDump, [
					{
						key : 'VTYPE'
					}, {
						key : 'VTYPEPOS'
					}
			] );
		}
		var fields = this.fldDump;
		for ( idx = 0, size = fields.length; idx < size; ++idx ) {
			html.widgets.push( fields[ idx ].dump( ) );
		}
		if ( isDebugOn( 'SCREENDUMP' ) )
			console.debug( sDebug( 'SCREENDUMP', this.screenName, '', '', msg, makeJSON( html ) ) );

	},

	resetState : function( ) {
		this.state = this.createStateObject( false, this.state.numTimes );
	},
	resetScreenInfo : function( fullReset ) {
		// state flags
		var cNumTimes = this.getCurrNumTimes( );
		this.resetState( );
		this.setCurrNumTimes( cNumTimes );

		this.setExit( false, 'reset' ); // set to TRUE if this screen is completed.
		this.exitCode = InforMetaScreen.EXIT_NORMAL;
		this.resume = false;

		this.xmitMessage = '';

		if ( fullReset )
			this.setCurrNumTimes( 1 );
		this.xmitDone = false;
		this.currPage = 1;
		this.validateRow = 0;
		if ( this.VALIDATEINPUT )
			this.validateRow = this.findNextValidateField( );

		this.selectorData = [ ];
	},

	resetScreenDisplays : function( ) {
		layoutDIV.children( ).remove( );
		headerDIV.find( '.SCE-Meta-LayoutWidget' ).remove( );
		footerDIV.children( ).remove( );
	},
	getExit : function( ) {
		return this.state.exitScreen;
	},
	setExit : function( exit, reason ) {
		if ( isDebugOn( "SCREENFLOW" ) )
			console.debug( 'SCREENFLOW', 'setExit', this.screenName, exit, reason );
		this.state.exitScreen = exit;
	},
	getNumTimes : function( ) {
		return this.state.numTimes;
	},
	setNumTimes : function( num ) {
		this.state.numTimes = num;
	},
	getCurrNumTimes : function( ) {
		return this.state.currNumTimes;
	},
	setCurrNumTimes : function( num ) {
		this.state.currNumTimes = num;
	},
	setSearchResultNavButtons : function( ) {
		if ( !currentScreen.searchResultData )
			return;

		if ( currentScreen.searchResultIndex >= currentScreen.searchResultData.length - 1 ) {
			// on last page
			$( '#SRDOWN' ).disable( );
			$( '#SUP' ).enable( );
		} else if ( currentScreen.searchResultIndex === 0 ) {
			// on first page
			$( '#SRDOWN' ).enable( );
			$( '#SRUP' ).disable( );
		} else {
			// in the middle somewhere.
			$( '#SRDOWN' ).enable( );
			$( '#SRUP' ).enable( );
		}
	},

	searchResultNav : function( action ) {
		if ( action === 'select' ) {

		} else if ( action === 'up' && currentScreen.searchResultIndex > 0 ) {
			currentScreen.searchResultIndex -= 1;
			currentScreen.copySearchResultDataToWidget( );
			currentScreen.buildScreen( false, false, false, false );
		} else if ( action === 'down' && currentScreen.searchResultIndex < currentScreen.searchResultData.length - 1 ) {
			currentScreen.searchResultIndex += 1;
			currentScreen.copySearchResultDataToWidget( );
			currentScreen.buildScreen( false, false, false, false );
		} else {
			currentScreen.setFirstFieldFocus( ); // loop back to the top
		}

		currentScreen.setSearchResultNavButtons( );
	},

	setRecordNumber : function( value ) {
		var tWidget = this.getWidgetByName( 'recnum' );
		if ( value ) {
			this.currREC = parseInt( value );
			if ( tWidget ) {
				tWidget.setValue( '' + value );
				$( '#recnum' ).html( this.currREC );
			}
		} else {
			if ( tWidget ) {
				this.currREC = parseInt( tWidget.getRawValue( ) );
			}
		}
	},

	setRecordTotal : function( value ) {
		var tWidget = this.getWidgetByName( 'rectot' );

		if ( value ) {
			this.totalREC = parseInt( value );
			if ( tWidget ) {
				tWidget.setValue( '' + value );
			}
		} else {
			if ( tWidget ) {
				this.totalREC = parseInt( tWidget.getDisplayValue( ) );
			}
		}
	},

	setPassedData : function( key, data ) {
		key = key.toUpperCase( );
		if ( data ) {
			if ( !passedData.hasOwnProperty( key ) ) {
				passedData[ key ] = {};
			}

			passedData[ key ] = data;
		} else {
			if ( passedData[ key ] )
				delete passedData[ key ];
		}
	},

	/*
	 * When navigating to a new screen from this current screen and we don't want to do normal resume processing on return.
	 */
	setResume : function( resumeScreen ) {
		console.debug( screenDebug( "SCREENFLOW", this, 'Setting doResumeProc to [' + resumeScreen + ']' ) );
		this.state.doResumeProc = resumeScreen;
	},

	getResume : function( ) {
		return this.state.doResumeProc;
	},

	setKeyStroke : function( keyStrokeTriggered ) {
		this.keyStrokeTriggered = keyStrokeTriggered;
	},

	getKeyStroke : function( ) {
		return this.keyStrokeTriggered;
	},

	stayOnScreen : function( ) {
		if ( this.VALIDATEINPUT || this.SELECTOR || this.SEARCHRESULT || this.DISPLAYONLY ) {
			return true;
		}

		var stay = false, flds = this.screenFields, idx = 0, l = flds.length, widget = null;

		//
		// is there an input of some type on this screen that can be edited?
		//
		for ( ; idx < l; ++idx ) {
			widget = flds[ idx ];

			if ( !widget.isVisible( ) ) {
				continue;
			}

			if ( isDebugOn( 'SCREENFLOW' ) )
				console.debug( widgetDebug( 'SCREENFLOW', widget, 'Widget is visible, stay on screen', widget.NAME ) );

			stay = true;
			break;
		}

		return stay;
	},
	createStateObject : function( copy, numTimes ) {
		var state = null;
		if ( copy ) {
			state = {
				SENDIF : this.state.SENDIF,
				IFRECEIVE : this.state.IFRECEIVE,
				ERROR : this.state.ERROR,
				ONENTER : this.state.ONENTER,
				CANCEL : this.state.CANCEL,
				ERRORCODE : this.state.ERRORCODE,
				DISPLAYMESSAGE : this.state.DISPLAYMESSAGE,
				exitScreen : this.state.exitScreen,
				numTimes : this.state.numTimes,
				currNumTimes : this.state.currNumTimes,
				doResumeProc : this.state.doResumeProc
			};
		} else {
			var defNumTimes = -1;
			if ( typeof numTimes != 'undefined' ) {
				defNumTimes = numTimes;
			}
			console.debug( this.screenName, 'reset numTimes is', defNumTimes );
			console.debug( this.screenName, 'reset currNumTimes is 1' );
			state = {
				SENDIF : -1,
				IFRECEIVE : -1,
				ERROR : -1,
				ONENTER : -1,
				CANCEL : -1,
				ERRORCODE : 1,
				DISPLAYMESSAGE : -1,
				exitScreen : false,
				numTimes : defNumTimes,
				currNumTimes : 1,
				doResumeProc : true
			};
		}

		return state;
	},
	getWidgetPage : function( widget, rowsPerPage ) {
		return Math.ceil( ( widget.VPOS + 1 ) / rowsPerPage );
	},
	syncDisplayState : function( ) {
		var idx = 0, fld = null, flds = this.screenFields, l = flds.length;

		for ( ; idx < l; ++idx ) {
			fld = flds[ idx ];
			if ( fld.inDisplaySync === false && fld.WTYPE != WIDGET_IMAGE && fld.WTYPE != WIDGET_LABEL && fld.isVisible( ) && !fld.isReadonly( ) ) {
				var jQobj = $( '#' + fld.ID );
				if ( jQobj.length != 0 ) {
					if ( isDebugOn( "WIDGET" ) )
						console.debug( widgetDebug( 'WIDGET', fld, 'sync state processing', 'valid widget to sync' ) );
					fld.setValue( jQobj.val( ) );
				}
			} else {
				if ( isDebugOn( "WIDGET" ) )
					console.debug( widgetDebug( 'WIDGET', fld, 'sync state processing', 'not valid widget for sync:' + fld.inDisplaySync ) );
			}
		}
	},
	evaluateScreenName : function( val ) {
		if ( val.indexOf( '->' ) != -1 ) {
			var splt = val.split( '->' );
			var widget = this.getWidgetByName( splt[ 1 ], splt[ 0 ], false );
			if ( widget )
				return widget.getValue( );
		}

		return val;
	}

};

InforMetaScreen.EXIT_ERROR = -1;
InforMetaScreen.EXIT_NORMAL = 0;
InforMetaScreen.EXIT_CANCEL = 1;
InforMetaScreen.EXIT_NEXT = 2;
InforMetaScreen.EXIT_PREV = 3;
