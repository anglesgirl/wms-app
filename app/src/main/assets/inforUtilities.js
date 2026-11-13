var tableStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var table = tableStr.split( "" );
var inforUtilitiesVersion = '11.0.1.0006';

$( function( ) {
	if ( !String.prototype.trim ) {
		String.prototype.trim = function( ) {
			return this.replace( /^\s+|\s+$/g, '' );
		};
	}

	if ( !String.prototype.endsWith ) {
		String.prototype.endsWith = function( suffix ) {
			return ( this.indexOf( suffix, this.length - suffix.length ) != -1 );
		};
	}

	if ( !String.prototype.startsWith ) {
		String.prototype.startsWith = function( input ) {
			return this.lastIndexOf( input, 0 ) === 0;
		};
	}
} );

// obj is assume to be a JQuery Object.
function moveThisToTheFront(obj) {
	var z = $('#inforLoadingOverlay').zIndex();
	var z2 = $('#selectorDetail').zIndex();
	z = z2 > z ? z2 : z;

	var c = obj.zIndex();

	if (z > 0 && z > c) {
		obj.zIndex( z+1 );
	}

}

function css(a) {
	var sheets = document.styleSheets, o = { };
    try {
	    for (var i in sheets) {
	        var rules = sheets[i].rules || sheets[i].cssRules;
	        for (var r in rules) {
	            if (a.is(rules[r].selectorText)) {
	                o = $.extend(o, css2json(rules[r].style), css2json(a.attr('style')));
	            }
	        }
	    }
	} catch ( e ) {
	}
    return o;
}

function css2json(css) {
    var s = {};
	if (!css)
		return s;
    if (css instanceof CSSStyleDeclaration) {
        for (var i in css) {
            if ((css[i]).toLowerCase) {
                s[(css[i]).toLowerCase()] = (css[css[i]]);
            }
        }
    } else if (typeof css == "string") {
        css = css.split("; ");
        for (var i in css) {
            var l = css[i].split(": ");
            s[l[0].toLowerCase()] = (l[1]);
        }
    }
    return s;
}

function replaceAll( theString, findToken, replaceToken) {
	if ( !findToken || findToken.length === 0 )
		return theString;

	while (theString.indexOf(findToken) != -1) {
		theString = theString.replace(findToken, replaceToken);
	}

	return theString;
}

function getSelectedText( theObject ) {
    var text = "";
    if (theObject) {
    	// we have to do this because IE is stupid. every other browser supports
    	// window.getSelection for input fields but nooooo not IE, can't have that
    	try {
			if (theObject[0].selectionStart != theObject[0].selectionEnd) {
				var val = theObject.val();
				text = val.slice(theObject[0].selectionStart, theObject[0].selectionEnd);
			}
    	} catch (e) {
    		// can error when input is a 'number' type
    	}
    } else if (typeof window.getSelection != "undefined") {
        text = window.getSelection().toString();
    } else if (typeof document.selection != "undefined" && document.selection.type === "Text") {
    	// this is for PRE IE 9, which we don't support anyway.
   		text = document.selection.createRange().text;
    }

    return text;
}

function padString(value, length, pad, dir) {
	if (typeof pad === "undefined") {
		pad = ' ';
	}
	if (typeof dir === "undefined") {
		dir = 1;
	}
	if (typeof value !== 'string') {
		value = '' + value;
	}

    if (length + 1 >= value.length) {
        switch (dir) {
            case 0:
            	value = Array(length + 1 - value.length).join(pad) + value;
                break;

            case 2:
                var right = Math.ceil((padlen = length - value.length) / 2);
                var left = padlen - right;
                value = Array(left+1).join(pad) + value + Array(right+1).join(pad);
                break;

            default:
            	value = value + Array(length + 1 - value.length).join(pad);
            	break;
        }
    }

    return value;
}

function getStringInstancesCount(val, find) {
    val = '' + val;
    find = '' + find;

	var count = 0, pos = 0;
    while ( true ) {
        pos = val.indexOf( find, pos );
        if( pos !== -1 ) {
        	++count;
        	pos += 1;
        } else {
        	break;
        }
    }
    return count;
}

function stringToInt(val) {
	if (isNaN( val ) || val === "") {
		return 0;
	} else {
		return parseInt(val);
	}
}

function stringToFloat(val) {
	if (isNaN( val ) || val === "") {
		return 0;
	} else {
		return parseFloat(val);
	}
}

function getSubString( theString, startIdx, delimiter ) {
	var idx = theString.indexOf( delimiter, startIdx );
	if (idx >= 0) {
		var temp = theString.substring(startIdx, idx);
		return temp;
	}
	return null;
}

function atob( base64 ) {
	if (/(=[^=]+|={3,})$/.test(base64))
		throw new Error("String contains an invalid character");
	base64 = base64.replace( /=/g, "" );
	var n = base64.length & 3;
	if (n === 1)
		throw new Error("String contains an invalid character");
	for ( var i = 0, j = 0, len = base64.length / 4, bin = [ ]; i < len; ++i ) {
		var a = tableStr.indexOf( base64[j++] || "A" ), b = tableStr.indexOf( base64[j++] || "A" );
		var c = tableStr.indexOf( base64[j++] || "A" ), d = tableStr.indexOf( base64[j++] || "A" );
		if ((a | b | c | d) < 0)
			throw new Error("String contains an invalid character");
		bin[bin.length] = ( ( a << 2 ) | ( b >> 4 ) ) & 255;
		bin[bin.length] = ( ( b << 4 ) | ( c >> 2 ) ) & 255;
		bin[bin.length] = ( ( c << 6 ) | d ) & 255;
	}
	return String.fromCharCode.apply( null, bin ).substr( 0, bin.length + n - 4 );
	}

function btoa( bin ) {
	for ( var i = 0, j = 0, len = bin.length / 3, base64 = [ ]; i < len; ++i ) {
		var a = bin.charCodeAt( j++ ), b = bin.charCodeAt( j++ ), c = bin.charCodeAt( j++ );
		if ((a | b | c) > 255)
			throw new Error("String contains an invalid character");
		base64[base64.length] = table[a >> 2] + table[ ( ( a << 4 ) & 63 ) | ( b >> 4 )] + ( isNaN( b ) ? "=" : table[ ( ( b << 2 ) & 63 ) | ( c >> 6 )] ) + ( isNaN( b + c ) ? "=" : table[c & 63] );
	}
	return base64.join( "" );
}

function hexToBase64( str ) {
	return btoa( String.fromCharCode.apply( null, str.replace( /\r|\n/g, "" ).replace( /([\da-fA-F]{2}) ?/g, "0x$1 " ).replace( / +$/, "" ).split( " " ) ) );
}

function base64ToHex( str ) {
	try {
		for ( var i = 0, bin = atob( str.replace( /[ \r\n]+$/, "" ) ), hex = []; i < bin.length; ++i ) {
			var tmp = bin.charCodeAt( i ).toString( 16 );
			if (tmp.length === 1)
				tmp = "0" + tmp;
			hex[hex.length] = tmp;
		}
		return hex.join( " " );
	} catch (e) {
		console.error(e);
		return null;
	}
}

function roundNumber( number, digits ) {
	var multiple = Math.pow( 10, digits );
	var rndedNum = Math.floor( number * multiple ) / multiple;
	return rndedNum;
}

function addEncodedDataParameters( ) {
	var encoded = '', idx = 0, arg = '', l = arguments.length;

	for ( ; idx < l; ++idx ) {
		arg = arguments[idx];
		if ( typeof arg === 'string' ) {
			arg = arg.replace( /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/gi, '' );
		}
		encoded = encoded + encodeURIComponent( arg ) + parmDelimiter;
	}
	return encoded;
}

function addDataParameters( ) {
	var str = '', idx = 0, arg = '', l = arguments.length;

	for ( ; idx < l; ++idx ) {
		arg = arguments[idx];
		if ( typeof arg === 'string' ) {
			arg = arg.replace( /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/gi, '' );
		}
		str = str + arg + parmDelimiter;
	}

	return str;
}

function parseReturnString( rawString ) {
	return new returnObject( rawString );
}

function decodeArray( arr ) {
	var idx = 0, l = arr.length, s = null;

	for (; idx < l; ++idx) {
		s = arr[idx];
		if (typeof s === 'string') {
			arr[idx] = decode(s);
		} else if (typeof s === 'object') {
			for (var key in s) {
				arr[idx][key] = decode(s[key]);
			}
		}
	}
}

function decode( s ) {
	try {
		// we're translating the + back to spaces. The Java end sometimes converts spaces to +
		// instead of %20. JavaScript side leaves the + as a +
		return decodeURIComponent( s );
	} catch ( e ) {
		// most likely received something not encoded to begin with so just ignore it.
		return s;
	}
}

function beep( ) {
	// $( "#sound_" ).remove( );
	// $( 'body' ).append( '<embed id="sound_" autostart="true" hidden="true" src="sound/beep.wav" />' );
	vibrateDevice( 'vibrateOnValidationError' );
}

function isBlank( value ) {
	return (/^\s*$/).test(value);
}

function iscntrl( chr, jqr ) {
	if (typeof jqr === 'undefined')
		jqr = false;

	if (typeof chr === 'number') {
		if (chr <= 46 || chr === 91 || chr === 92 || (chr >= 112 && chr <= 123))
			return true;
		else
			return false;
	} else if (typeof chr === 'string') {
		if ( chr.charCodeAt( 0 ) < 32 )
			return true;
		else
			return false;
	}
}

function isdigit( chr ) {
	return /[0-9]/.test( chr );
}

function isalnum( chr ) {
	return isalpha( chr ) || isdigit( chr );
}

function isspace( chr ) {
	return /[\s\t\n\r]/.test( chr );
}

function dump( obj ) {
	if (!appConfig.debug.DUMP || !obj)
		return '';

	if (typeof obj === 'string') {
		return '<td>'+obj+'</td>';
	} else if (typeof obj === 'object') {
		if (obj.dump) {
			return obj.dump();
		} else {
			var t = '';
			for (var key in obj) {
			    if (obj.hasOwnProperty(key)) {
			        var v = obj[key];
			        t += dump(v);
			    }
			}
			return t;
		}
	} else {
		return '';
	}
}

function makeJSON(obj) {
	try {
		return JSON.stringify(obj);
	} catch (e) {
		return 'failed to convert to JSON!';
	}
}

/*
 * automatically scrolls the container to the position of target within that container
 */
function scrollToNav( container, target, callback, data ) {
	var scY = -1;
	try {
		if ( !container || !target || target.length === 0 || container.length === 0 ) {
			return scY;
		}

		//
		// with the CSS scaling, the pixel counts will get off. Convert it back down to pre-scale pixels
		// and then set the scrollTop to this unscaled value. CSS scaling will take over and set it properly.
		// There is still a small error in the scrollTop value, might be from rounding. Long lists will
		// compound the small error.
		//
		var tTop = target.offset().top / appConfig.forcedScaleY;
		var csTop = container.scrollTop() / appConfig.forcedScaleY;
		var coTop = container.offset().top / appConfig.forcedScaleY;

		scY = tTop + csTop - coTop;
		container.animate({
			scrollTop: scY
		}, 100, 'linear', function () {
			if ( typeof callback === 'function' ) {
				callback( data, scY );
			}
		} );
	} catch ( e ) {
		console.error( target );
		console.error( e );
	}
	return scY;
}

function returnObject( rawString ) {
	var ret = null;
	if (typeof rawString == 'string') {
		if (rawString.startsWith('{')) {
			ret = JSON.parse(rawString);
		} else {
			rawString = rawString.split( parmDelimiter );
		}
	}

	this.ptcid = ret ? ret.ptcid : rawString[0] ? decode(rawString[0]) : '';
	this.userid = ret ? ret.userid : rawString[1] ? decode(rawString[1]) : '';
	this.taskid = ret ? ret.taskid : rawString[2] ? decode(rawString[2]) : '';
	this.compid = ret ? ret.compid : rawString[3] ? decode(rawString[3]) : '';
	this.appflag = ret ? ret.appflag : rawString[4] ? decode(rawString[4]) : '';
	this.rectype = ret ? ret.rectype : rawString[5] ? decode(rawString[5]) : '';
	this.server = ret ? ret.server : rawString[6] ? decode(rawString[6]) : '';
	this.miscmsg = ret ? ret.miscmsg : rawString[7] ? decode(rawString[7]) : '';
	this.rectotal = ret ? ret.rectotal : rawString[8] ? decode(rawString[8]) : '';
	this.data = ret ? ret.data : rawString[9] ? rawString.slice(9) : [];

	decodeArray(this.data);
}

returnObject.prototype.setValue = function(parameter, value) {
	if (typeof parameter == 'string')
		this[parameter] = value;
	else if (typeof parameter == 'number')
		this.data[parameter] = value;
};

returnObject.prototype.getValue = function(parameter) {
	if (typeof parameter == 'string')
		return this[parameter];
	else if (typeof parameter == 'number')
		return this.data[parameter];
	else
		return null;
};

returnObject.prototype.getCode = function() {
	return parseInt(this.getValue('rectype'));
};

returnObject.prototype.getMessage = function() {
	return this.getValue('miscmsg');
};

function versionInformation() {
	try {
		var html = {};
		try {
			html = {
				file: 'inforMetaClient',
				version: inforMetaClientVersion
			};
		} catch (e) {
			html = {};
		}

		var obj = [
			{
				file: 'inforMetaScreen',
				version: inforMetaScreenVersion
			}, {
				file: 'inforMetaScreenController',
				version: inforMetaScreenControllerVersion
			}, {
				file: 'inforMetaWidget',
				version: inforMetaWidgetVersion
			}, {
				file: 'inforMetaFramework',
				version: inforMetaFrameworkVersion
			}, {
				file: 'inforMetaWS',
				version: inforMetaWSVersion
			}, {
				file: 'inforUtilities',
				version: inforUtilitiesVersion
			}, {
				file: 'inforBarcode',
				version: inforBarcodeVersion
			}, {
				file: 'inforUserMsg',
				version: inforUserMsgVersion
			}, {
				file: 'inforDate',
				version: inforDateVersion
			}, {
				file: 'inforMetaExpression',
				version: inforMetaExpressionVersion
			}
		];

		var dbgString = 'WebRF: ['+html.version+']';
		
		for ( var idx = 0; idx < obj.length; ++idx ) {
			if ( obj[ idx ].version != html.version ) {
					dbgString += '<BR>' + obj[ idx ].file + ':'+obj[ idx ].version;
			}
		}

		if (isDebugOn('DEBUG'))
			console.debug(simpleDebug('DEBUG', 'Version Information', dbgString));

		return dbgString;
	} catch (e) {
		return 'Version Error! ' + (e.message ? e.message : e);
	}
}

function sanitizeTimeFormats( format ) {
	// converts a time format of 12 hour clock + AM/PM to 24 hour clock.
	return format.replace( 'hh:', 'HH:' ).replace( 'h:', 'H:' ).replace( ' tt', '' );
}

function isprint( chr ) {
	return isalnum( chr ) || /[{|}~[\]^_`:;<=>?@'"\s!#$%&()*+,-./]/.test( chr );
}

/*
 * if it's not any other category, consider it ALPHA to allow for locale independent alpha characters
 */
function isalpha( chr ) {
	return !isdigit( chr ) && !isspace( chr ) && !iscntrl( chr ) && !/[{|}~[\]^_`:;<=>?@'"\s!#$%&()*+,-./]/.test( chr );
}

