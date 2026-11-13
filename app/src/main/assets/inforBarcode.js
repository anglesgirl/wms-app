// just some temp processing variables for performance reasons.
// assumes there is only one instance of InforBarcode. If for some reason
// we start using two or more instances, these need to be moved in scope.
var brcdIdx = 0;
var brcdLength = 0;
var tempBrcdID = null;

var inforBarcodeVersion = '11.0.1.0006';

InforBarcode = function( barcodeConfig ) {
	this.config = barcodeConfig; // reference to appConfig.barcodeConfig
	this.BRCDID = barcodeConfig.BRCDID;
	if ( typeof this.BRCDID !== 'object' )
		this.BRCDID = [ ];

	if ( this.BRCDID.length > 0 ) {
		this.BRCDID.sort( function( a, b ) {
			return a.length > b.length ? -1 : a.length < b.length ? 1 : 0;
		} );
	}
	brcdLength = this.BRCDID.length;
	if ( isDebugOn( 'BARCODE' ) )
		console.debug( simpleDebug( 'BARCODE', 'initalizing barcode config', brcdLength ) );
	if ( this.config.procName.toLowerCase( ).startsWith( 'nsprf' ) ) {
		this.config.appFlag = this.config.procName.substring( 5 );
	} else {
		this.config.appFlag = this.config.procName;
		this.config.procName = 'nsprf' + this.config.procName;
	}
};

InforBarcode.prototype.exists = function( val ) {
	if ( isDebugOn( 'BARCODE' ) )
		console.debug( simpleDebug( 'BARCODE', 'checking value', val ) );
	if ( !val || val.length === 0 )
		return null;

	brcdIdx = 0;
	for ( ; brcdIdx < brcdLength; ++brcdIdx ) {
		tempBrcdID = this.BRCDID[ brcdIdx ];
		if ( isDebugOn( 'BARCODE' ) )
			console.debug( simpleDebug( 'BARCODE', 'compare [' + tempBrcdID + '] against', val ) );
		if ( val && val.startsWith( tempBrcdID ) ) {
			if ( isDebugOn( 'BARCODE' ) )
				console.debug( simpleDebug( 'BARCODE', 'match found', val ) );
			return tempBrcdID;
		}
	}

	if ( isDebugOn( 'BARCODE' ) )
		console.debug( simpleDebug( 'BARCODE', 'no match found', val ) );
	return null;
};

InforBarcode.prototype.getScanData = function( barcodeConfigKey, barcodeScanData, asn, order, owner, item, po, handler ) {
	//
	// identifier,barcodescanstr,ASN,ORDER,OWNER,ITEM,PO
	//
	var sendStr = 'EXEC ' + this.config.procName + '  ' + buildXMITHeader( this.config.procName, this.config.appFlag ) + addEncodedDataParameters( barcodeConfigKey, barcodeScanData, asn, order, owner, item, po );
	ws.sendMessage( this.config.procName, sendStr, InforBarcode.parseReturnData, handler, false );
};

InforBarcode.parseReturnData = function( data, handler ) {

	// clear out the widget scanned into
	if ( handler.widget && handler.widget.setValue ) {
		// got a widget.
		handler.widget.setValue( '' ); // clear the scan
		$( '#' + handler.widget.ID ).val( '' );
	}

	// idx 5 is error
	// idx 9 and after is scan data
	var tempData = data.split( ',' );
	if ( parseInt( tempData[ 5 ] ) == 9 ) {
		displayPageError( SCElocalize( decode( tempData[ 7 ] ) ), function( ) {
			currentScreen.enableScreen( );
		} );
		return;
	}

	if ( handler ) {
		var scanData = [ ];

		for ( var idx = 9, l = tempData.length; idx < l; idx = idx + 2 ) {
			var obj = {
				typ : tempData[ idx ],
				val : tempData[ idx + 1 ]
			};
			scanData.push( obj );
		}

		handler.func( scanData, handler.widget );
	}
};
