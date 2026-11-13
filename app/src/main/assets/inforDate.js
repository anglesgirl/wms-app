var inforDateVersion = '11.0.1.0006';

InforDate = function( year, month, day, hour, minute, seconds, milliseconds ) {
	this.datetime = false;

	if ( typeof year === 'number' ) {
		if ( typeof month === 'number' ) {
			this.internalDate = new Date( year, month, ( day ? day : 1 ), ( hour ? hour : 0 ), ( minute ? minute : 0 ), ( seconds ? seconds : 0 ), ( milliseconds ? milliseconds : 0 ) );
		} else {
			this.internalDate = new Date( );
			this.internalDate.setTime( year );
		}
	} else if ( typeof year === 'string' ) {
		// try and convert string to date.
		this.internalDate = new Date( year );
	} else if ( Object.prototype.toString.call( year ) === "[object Date]" ) {
		this.internalDate = year;
	} else {
		this.internalDate = null;
	}
};

InforDate.prototype.formatDateForMsgDisplay = function( ) {
	var format = '';
	if ( this.internalDate ) {
		try {
				if ( this.isFromToday( ) ) {
					// just show the time piece
				format = $.datepicker.formatDate( this.internalDate, closestDateCulture.calendar.patterns.t, usersDateLocale );
				} else {
					// just show the date piece
				format = $.datepicker.formatDate( this.internalDate, closestDateCulture.calendar.patterns.d, usersDateLocale );
			}
		} catch ( e ) {
		}
	}

	return format;
};

InforDate.prototype.isFromToday = function( ) {
	var compareDate = new Date( ); // it's today!

	if ( !this.internalDate )
		return false;
	else if ( this.internalDate.getFullYear( ) < compareDate.getFullYear( ) || this.internalDate.getMonth( ) < compareDate.getMonth( ) || this.internalDate.getDate( ) < compareDate.getDate( ) )
		return false;
	else
		return true;
};

InforDate.prototype.isValid = function( dt ) {
	var d = null;
	if ( !dt )
		d = this.internalDate;
	else
		d = dt;

	if ( !d ) {
		// we received nothing to verify, it's ok to be blank date.
		return true;
	}

	if ( Object.prototype.toString.call( d ) !== "[object Date]" )
		return false;

	var isGood = !isNaN( d.getTime( ) );
	if ( isDebugOn( 'WIDGET' ) )
		console.debug( simpleDebug( 'WIDGET', 'DATE', 'IsValid:' + isGood ) );
	return isGood;
};

InforDate.prototype.getTime = function( ) {
	return ( this.internalDate ? this.internalDate.getTime( ) : null );
};

InforDate.prototype.addMinutes = function( minutes ) {
	var tempDate = new Date( this.internalDate );
	tempDate.setTime( tempDate.getTime( ) + ( minutes * 60 * 1000 ) );
	return tempDate;
};

InforDate.prototype.getDate = function( format ) {
	try {
		if ( !this.internalDate ) {
			return '';
		} else if ( format === 'SEND' && appConfig.dateFunction && appConfig.dateFunction.length > 0 ) {
			var fmt = this.datetime ? appConfig.serverDateTimeFmt : appConfig.serverDateFmt;
			var temp = new Date( this.internalDate );
			if ( this.datetime ) {
				temp = $.datepicker.formatDate( this.addMinutes( userConfig.facilityTZ - temp.getTimezoneOffset( ) ), fmt, usersDateLocale );
			} else {
				temp = $.datepicker.formatDate( this.internalDate, fmt, usersDateLocale );
			}
			var dtfunc = this.datetime ? 'DTTIME_RF' : 'DT_RF';
			temp = dtfunc + '("' + temp + '","' + fmt + '")';
			if ( isDebugOn( 'WIDGET' ) )
				console.debug( simpleDebug( 'WIDGET', 'DATE', temp ) );
			return temp;
		} else if ( format === 'SERVER' || format === 'SEND' ) {
			var fmt = this.datetime ? controller.dateTimeFmt : controller.dateFmt;
			if ( isDebugOn( 'WIDGET' ) )
				console.debug( simpleDebug( 'WIDGET', usersDateLocale, fmt ) );
			return $.datepicker.formatDate( this.internalDate, fmt, usersDateLocale );
		} else if ( format === 'LOCAL' ) {
			// short date pattern
			// d: "M/d/yyyy",
			// long date pattern
			// D: "dddd, MMMM dd, yyyy",
			// short time pattern
			// t: "h:mm tt",
			// long time pattern
			// T: "h:mm:ss tt",
			// long date, short time pattern
			// f: "dddd, MMMM dd, yyyy h:mm tt",
			// long date, long time pattern
			// F: "dddd, MMMM dd, yyyy h:mm:ss tt",
			var fmt = this.datetime ? controller.dateTimeFmt : controller.dateFmt;
				if ( isDebugOn( 'WIDGET' ) )
				console.debug( simpleDebug( 'WIDGET', usersDateLocale, fmt ) );
			return $.datepicker.formatDate( this.internalDate, fmt, usersDateLocale );
		}
	} catch ( e ) {
	}

	return '';
};

InforDate.prototype.setTime = function( millisecondsValue ) {
	if ( !this.internalDate )
		this.internalDate = new Date( );
	this.internalDate.setTime( millisecondsValue );
	return this.isValid( );
};

InforDate.prototype.setDate = function( stringValue, fromServer ) {
	try {
		if ( fromServer ) {
			if ( this.datetime ) {
				this.internalDate = $.datepicker.parseDate( stringValue, appConfig.serverDateTimeFmt );
			} else {
				this.internalDate = $.datepicker.parseDate( stringValue, appConfig.serverDateFmt );
			}
		} else {
			if ( this.datetime ) {
				this.internalDate = $.datepicker.parseDate( stringValue, controller.dateTimeFmt, usersDateLocale );
			} else {
				this.internalDate = $.datepicker.parseDate( stringValue, controller.dateFmt, usersDateLocale );
			}
		}

		return this.isValid( );
	} catch ( e ) {
	}

	return false;
};

InforDate.prototype.copy = function( ) {
	var theCopy = new InforDate( this.getTime( ) );

	return theCopy;
};
